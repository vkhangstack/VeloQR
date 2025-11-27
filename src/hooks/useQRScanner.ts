import { useRef, useState, useCallback, useEffect } from 'react';
import { QRCodeResult, UseQRScannerOptions, UseQRScannerReturn, CameraDevice } from '../types';
import { initWasm, decodeQRFromImageData } from '../utils/qr-processor';
import { isSafariOrIOS, getSafariOptimizedConstraints } from '../utils/browser-detection';
import { FrameBuffer, optimizeFrameForSafari } from '../utils/performanceOptimizer';
import { createCameraError } from '../constants/cameraErrors';
import { triggerVibrate } from '../utils/vibrate';

export function useQRScanner(options: UseQRScannerOptions = {}): UseQRScannerReturn {
  const {
    scanDelay = 500,
    onScan,
    onError,
    videoConstraints = {},
    enableFrameMerging = false,
    frameMergeCount = 3,
    optimizeForSafari = isSafariOrIOS(),
    preferredCamera = 'environment',
    resolutionScale = 1,
    crop,
    sharpen,
    vibrate = false,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResults, setLastResults] = useState<QRCodeResult[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [currentCamera, setCurrentCamera] = useState<CameraDevice | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wasmInitializedRef = useRef(false);
  const isScanningRef = useRef(false);
  const frameBufferRef = useRef<FrameBuffer | null>(null);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Initialize frame buffer if frame merging is enabled
  useEffect(() => {
    if (enableFrameMerging && !frameBufferRef.current) {
      frameBufferRef.current = new FrameBuffer(frameMergeCount);
    } else if (!enableFrameMerging && frameBufferRef.current) {
      frameBufferRef.current = null;
    }
  }, [enableFrameMerging, frameMergeCount]);

  const scan = useCallback(async () => {
    // Skip if already scanning to prevent concurrent scans
    if (isScanningRef.current) {
      return;
    }

    if (!videoRef.current || !canvasRef.current || !isScanning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    // Throttle based on scanDelay
    const now = performance.now();
    if (now - lastScanTimeRef.current < scanDelay) {
      return;
    }

    isScanningRef.current = true;
    lastScanTimeRef.current = now;

    try {
      // Apply resolution scaling
      const scaledWidth = Math.floor(video.videoWidth * resolutionScale);
      const scaledHeight = Math.floor(video.videoHeight * resolutionScale);

      // Set canvas dimensions only once or when needed
      if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        // Reset cached context when dimensions change
        canvasContextRef.current = null;
      }

      // Get or create canvas context (cached for performance)
      if (!canvasContextRef.current) {
        canvasContextRef.current = canvas.getContext('2d', {
          alpha: false,
          desynchronized: true,
          willReadFrequently: true,
        });
      }

      const ctx = canvasContextRef.current;
      if (!ctx) {
        return;
      }

      // Apply image smoothing for better quality when scaling
      if (resolutionScale !== 1) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      // Draw video frame to canvas with scaling
      ctx.drawImage(video, 0, 0, scaledWidth, scaledHeight);

      // Get image data from canvas
      let imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);

      // Apply Safari optimization if enabled
      if (optimizeForSafari) {
        imageData = optimizeFrameForSafari(imageData);
      }

      // Apply frame merging if enabled
      if (enableFrameMerging && frameBufferRef.current) {
        frameBufferRef.current.addFrame(imageData);
        const mergedFrame = frameBufferRef.current.getMergedFrame();
        if (mergedFrame) {
          imageData = mergedFrame;
        }
      }

      // Decode QR codes
      const results = await decodeQRFromImageData(imageData, { crop, sharpen });

      if (results.length > 0) {
        if (vibrate) {
          triggerVibrate();
        }
        setLastResults(results);
        onScan?.(results);
      }
    } catch (err) {
      console.error('Scan error:', err);
      const scanError = err instanceof Error ? err : new Error('Unknown scan error');
      setError(scanError);
      onError?.(scanError);
    } finally {
      isScanningRef.current = false;
    }
  }, [isScanning, onScan, onError, enableFrameMerging, optimizeForSafari, resolutionScale, crop, sharpen, scanDelay]);

  // Render loop using requestAnimationFrame for smooth canvas updates
  const renderLoop = useCallback(() => {
    if (!isScanning) {
      return;
    }

    // Call scan which will handle throttling
    scan();

    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [isScanning, scan]);

  const getFacingMode = useCallback((camera: string): 'user' | 'environment' => {
    if (camera === 'front' || camera === 'user') {
      return 'user';
    }
    return 'environment';
  }, []);

  const startScanning = useCallback(async (cameraFacing?: 'front' | 'back' | 'environment' | 'user') => {
    try {
      // Initialize WASM if not already done
      if (!wasmInitializedRef.current) {
        await initWasm();
        wasmInitializedRef.current = true;
      }

      const facingMode = getFacingMode(cameraFacing || preferredCamera);

      // Build video constraints
      let constraints: MediaTrackConstraints = {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30},
        ...videoConstraints,
      };

      // Apply Safari optimizations if enabled
      if (optimizeForSafari) {
        constraints = getSafariOptimizedConstraints(constraints);
      }

      // Request camera access FIRST - only open camera ONCE to avoid double flash
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false,
      });

      streamRef.current = stream;

      // Get available cameras AFTER camera is already open (no double flash)
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const devices = allDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
          kind: 'videoinput' as const,
          groupId: device.groupId,
        }));
      setAvailableCameras(devices);

      // Identify current camera
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      const currentCam = devices.find(d => d.deviceId === settings.deviceId);
      if (currentCam) {
        setCurrentCamera(currentCam);
      }

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        // Wait for video metadata to load before playing
        await new Promise<void>((resolve, reject) => {
          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            resolve();
          };

          const handleError = (err: Event) => {
            video.removeEventListener('error', handleError);
            reject(new Error('Video loading failed'));
          };

          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);

          // Timeout after 5 seconds
          setTimeout(() => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            reject(new Error('Video loading timeout'));
          }, 5000);
        });

        // Now play the video - handle the promise properly
        try {
          await video.play();
        } catch (playError: any) {
          // Ignore "interrupted" errors as they're usually benign
          if (playError.name !== 'AbortError') {
            throw playError;
          }
        }
      }

      setIsScanning(true);
      setError(null);

      // Start render loop with requestAnimationFrame
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    } catch (err) {
      // Convert to CameraError with error code
      const cameraError = createCameraError(err);
      setError(cameraError);
      onError?.(cameraError);
      throw cameraError;
    }
  }, [renderLoop, onError, videoConstraints, optimizeForSafari, preferredCamera, getFacingMode]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);

    // Cancel animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear frame buffer
    if (frameBufferRef.current) {
      frameBufferRef.current.clear();
    }

    // Clear canvas context cache
    canvasContextRef.current = null;

    // Reset scan time
    lastScanTimeRef.current = 0;
  }, []);

  const switchCamera = useCallback(async (facingMode?: 'front' | 'back' | 'environment' | 'user') => {
    const wasScanning = isScanning;

    // Stop current scanning
    stopScanning();

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 300));

    // Start with new camera
    if (wasScanning) {
      await startScanning(facingMode);
    }
  }, [isScanning, stopScanning, startScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  // Start/restart render loop when scanning state changes
  useEffect(() => {
    if (isScanning && animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    } else if (!isScanning && animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isScanning, renderLoop]);

  return {
    videoRef,
    canvasRef,
    isScanning,
    startScanning,
    stopScanning,
    switchCamera,
    availableCameras,
    currentCamera,
    lastResults,
    error,
  };
}
