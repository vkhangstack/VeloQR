import { useRef, useState, useCallback, useEffect } from 'react';
import { QRCodeResult, UseQRScannerOptions, UseQRScannerReturn, CameraDevice, CameraFacingMode, CameraFacing } from '../types';
import { initWasm, decodeQRFromImageData } from '../utils/qr-processor';
import { isSafariOrIOS, getSafariOptimizedConstraints, isMobile } from '../utils/browser-detection';
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
    preferredCamera = CameraFacingMode.ENVIRONMENT,
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
  const wasPausedByVisibilityRef = useRef(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

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
    if (camera === CameraFacingMode.FRONT || camera === CameraFacingMode.USER) {
      return CameraFacingMode.USER;
    }
    return CameraFacingMode.ENVIRONMENT;
  }, []);

  const startScanning = useCallback(async (cameraFacing?: CameraFacing) => {
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
        frameRate: { ideal: 30 },
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

      // Notify other tabs that this tab is using the camera
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'camera-start',
          tabId: tabIdRef.current,
        });
      }

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

  const switchCamera = useCallback(async (facingMode?: CameraFacing) => {
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

  // Initialize BroadcastChannel for cross-tab communication
  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannelRef.current = new BroadcastChannel('camera-scanner-channel');

      // Listen for messages from other tabs
      const handleMessage = (event: MessageEvent) => {
        const { type, tabId } = event.data;

        // If another tab is starting the camera, stop this tab's camera
        if (type === 'camera-start' && tabId !== tabIdRef.current) {
          stopScanning();
        }
      };

      broadcastChannelRef.current.addEventListener('message', handleMessage);

      return () => {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.removeEventListener('message', handleMessage);
          broadcastChannelRef.current.close();
          broadcastChannelRef.current = null;
        }
      };
    }
  }, [isScanning, stopScanning]);

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

  // Handle tab visibility changes and window focus - stop camera when tab/window is inactive
  useEffect(() => {
    const isMobileDevice = isMobile();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden - force stop camera immediately
        // Check streamRef directly instead of isScanning state for more reliability
        if (streamRef.current) {
          wasPausedByVisibilityRef.current = true;
          stopScanning();
        }
      } else if (!document.hidden && wasPausedByVisibilityRef.current) {
        // Tab is now visible again
        // On desktop: auto-restart camera for better UX
        // On mobile: don't auto-restart, let user manually restart for smoother experience
        if (!isMobileDevice) {
          wasPausedByVisibilityRef.current = false;
          startScanning().catch((err) => {
            console.error('Failed to restart camera:', err);
            setError(err);
            onError?.(err);
          });
        } else {
          // Reset flag on mobile but don't auto-restart
          wasPausedByVisibilityRef.current = false;
        }
      }
    };

    // Additional handlers for mobile - pagehide is more reliable on some mobile browsers
    const handlePageHide = () => {
      if (streamRef.current) {
        wasPausedByVisibilityRef.current = true;
        stopScanning();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    // Only add blur/focus listeners on desktop for better UX
    // Mobile browsers handle these events inconsistently
    if (!isMobileDevice) {
      const handleWindowBlur = () => {
        if (isScanning) {
          // Window lost focus (user switched to another app) - pause scanning
          wasPausedByVisibilityRef.current = true;
          stopScanning();
        }
      };

      const handleWindowFocus = () => {
        if (wasPausedByVisibilityRef.current) {
          // Window gained focus and we paused due to blur - restart camera
          wasPausedByVisibilityRef.current = false;
          startScanning().catch((err) => {
            console.error('Failed to restart camera:', err);
            setError(err);
            onError?.(err);
          });
        }
      };

      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
      };
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isScanning, startScanning, stopScanning, onError]);

  const getFlashSupport = useCallback(async (): Promise<boolean> => {
    if (!streamRef.current) {
      return false;
    }
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities();
    return 'torch' in capabilities;
  }, []);

  const turnOnFlash = useCallback(async (): Promise<void> => {
    if (!streamRef.current) {
      throw new Error('Camera is not started');
    }
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities();
    if (!('torch' in capabilities)) {
      throw new Error('Flash/torch is not supported on this device');
    }
    (await (videoTrack as any).applyConstraints({
      advanced: [{ torch: true }]
    }));
  }, []);

  const turnOffFlash = useCallback(async (): Promise<void> => {
    if (!streamRef.current) {
      throw new Error('Camera is not started');
    }
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities() as any;
    if (!('torch' in capabilities)) {
      throw new Error('Flash/torch is not supported on this device');
    }
    (await (videoTrack as any).applyConstraints({
      advanced: [{ torch: false }]
    }));
  }, []);

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
    getFlashSupport,
    turnOnFlash,
    turnOffFlash,
  };
}
