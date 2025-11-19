import { useRef, useState, useCallback, useEffect } from 'react';
import { QRCodeResult, UseQRScannerOptions, UseQRScannerReturn, CameraDevice } from '../types';
import { initWasm, decodeQRFromImageData } from '../utils/qr-processor';
import { getCameraDevices, identifyCameras } from '../utils/camera-manager';
import { isSafariOrIOS, getSafariOptimizedConstraints } from '../utils/browser-detection';
import { FrameBuffer, optimizeFrameForSafari } from '../utils/performanceOptimizer';

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
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResults, setLastResults] = useState<QRCodeResult[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [currentCamera, setCurrentCamera] = useState<CameraDevice | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const wasmInitializedRef = useRef(false);
  const isScanningRef = useRef(false);
  const frameBufferRef = useRef<FrameBuffer | null>(null);

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

    isScanningRef.current = true;

    try {
      // Set canvas dimensions only once or when needed
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return;
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data from canvas
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

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
      const results = await decodeQRFromImageData(imageData);

      if (results.length > 0) {
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
  }, [isScanning, onScan, onError, enableFrameMerging, optimizeForSafari]);

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

      // Get available cameras
      const devices = await getCameraDevices();
      setAvailableCameras(devices);

      const facingMode = getFacingMode(cameraFacing || preferredCamera);

      // Build video constraints
      let constraints: MediaTrackConstraints = {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
        ...videoConstraints,
      };

      // Apply Safari optimizations if enabled
      if (optimizeForSafari) {
        constraints = getSafariOptimizedConstraints(constraints);
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false,
      });

      streamRef.current = stream;

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

      // Start scanning loop
      scanIntervalRef.current = window.setInterval(scan, scanDelay);
    } catch (err) {
      const startError = err instanceof Error ? err : new Error('Failed to start camera');
      setError(startError);
      onError?.(startError);
      throw startError;
    }
  }, [scan, scanDelay, onError, videoConstraints, optimizeForSafari, preferredCamera, getFacingMode]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);

    // Stop the scan interval
    if (scanIntervalRef.current !== null) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
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
  }, []);

  const switchCamera = useCallback(async (facingMode?: 'front' | 'back' | 'environment' | 'user') => {
    const wasScanning = isScanning;

    // Stop current scanning
    stopScanning();

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

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

  // Update scan interval when scanning state or scanDelay changes
  useEffect(() => {
    if (isScanning) {
      if (scanIntervalRef.current !== null) {
        clearInterval(scanIntervalRef.current);
      }
      scanIntervalRef.current = window.setInterval(scan, scanDelay);
    }

    return () => {
      if (scanIntervalRef.current !== null) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, scanDelay, scan]);

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
