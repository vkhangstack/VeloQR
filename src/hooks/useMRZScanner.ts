import { useRef, useState, useCallback, useEffect } from 'react';
import { MRZResult, UseMRZScannerOptions, UseMRZScannerReturn, CameraDevice, CameraFacingMode, CameraFacing } from '../types';
import { initWasm, decodeMRZFromImageData } from '../utils/mrz-processor';
import { getCameraDevices } from '../utils/camera-manager';
import { isSafariOrIOS, getSafariOptimizedConstraints, isMobile } from '../utils/browser-detection';
import { createCameraError } from '../constants/cameraErrors';

export function useMRZScanner(options: UseMRZScannerOptions = {}): UseMRZScannerReturn {
  const {
    scanDelay = 1000,
    onScan,
    onError,
    videoConstraints = {},
    preferredCamera = CameraFacingMode.ENVIRONMENT,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<MRZResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [currentCamera, setCurrentCamera] = useState<CameraDevice | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const wasmInitializedRef = useRef(false);
  const isScanningRef = useRef(false);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const wasPausedByVisibilityRef = useRef(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const scan = useCallback(async () => {
    // Skip if already scanning to prevent concurrent scans
    if (isScanningRef.current) {
      return;
    }

    // Throttle scans
    const now = Date.now();
    if (now - lastScanTimeRef.current < scanDelay) {
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
    lastScanTimeRef.current = now;

    try {
      // MRZ Optimization: Resize and crop bottom area
      const MAX_WIDTH = 800;
      const CROP_RATIO = 0.5; // Crop bottom 50% where MRZ is located

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Calculate resize dimensions
      const scale = Math.min(MAX_WIDTH / videoWidth, 1);
      const scaledWidth = Math.floor(videoWidth * scale);
      const scaledHeight = Math.floor(videoHeight * scale);

      // Calculate crop area (bottom portion)
      const cropStartY = Math.floor(scaledHeight * CROP_RATIO);
      const cropHeight = scaledHeight - cropStartY;

      // Set canvas to cropped dimensions
      if (canvas.width !== scaledWidth || canvas.height !== cropHeight) {
        canvas.width = scaledWidth;
        canvas.height = cropHeight;
        // Reset context cache when dimensions change
        canvasContextRef.current = null;
      }

      // Get or create cached context
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

      // Draw video frame to canvas with resize and crop
      // drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      ctx.drawImage(
        video,
        0, videoHeight * CROP_RATIO, videoWidth, videoHeight * (1 - CROP_RATIO), // Source crop
        0, 0, scaledWidth, cropHeight // Destination
      );

      // Get image data from cropped canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Decode MRZ
      const result = await decodeMRZFromImageData(imageData);

      if (result) {
        setLastResult(result);
        onScan?.(result);
      }
    } catch (err) {
      console.error('MRZ scan error:', err);
      const scanError = err instanceof Error ? err : new Error('Unknown scan error');
      setError(scanError);
      onError?.(scanError);
    } finally {
      isScanningRef.current = false;
    }
  }, [isScanning, onScan, onError, scanDelay]);

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

      // Get available cameras
      const devices = await getCameraDevices();
      setAvailableCameras(devices);

      const facingMode = getFacingMode(cameraFacing || preferredCamera);

      // Build video constraints with higher resolution for MRZ
      let constraints: MediaTrackConstraints = {
        facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 },
        ...videoConstraints,
      };

      // Apply Safari optimizations if needed
      if (isSafariOrIOS()) {
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

        // Now play the video
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

      // Start scanning loop
      scanIntervalRef.current = window.setInterval(scan, scanDelay);
    } catch (err) {
      // Convert to CameraError with error code
      const cameraError = createCameraError(err);
      setError(cameraError);
      onError?.(cameraError);
      throw cameraError;
    }
  }, [scan, scanDelay, onError, videoConstraints, preferredCamera, getFacingMode]);

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
  }, []);

  const switchCamera = useCallback(async (facingMode?: CameraFacing) => {
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

  // Initialize BroadcastChannel for cross-tab communication
  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannelRef.current = new BroadcastChannel('camera-scanner-channel');

      // Listen for messages from other tabs
      const handleMessage = (event: MessageEvent) => {
        const { type, tabId } = event.data;

        // If another tab is starting the camera, stop this tab's camera
        if (type === 'camera-start' && tabId !== tabIdRef.current && isScanning) {
          console.log('Another tab started camera, stopping this tab');
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

  // Handle tab visibility changes and window focus - stop camera when tab/window is inactive
  useEffect(() => {
    const isMobileDevice = isMobile();

    const handleVisibilityChange = () => {
      console.log('[MRZScanner] Visibility change:', document.hidden, 'hasStream:', !!streamRef.current);

      if (document.hidden) {
        // Tab is now hidden - force stop camera immediately
        // Check streamRef directly instead of isScanning state for more reliability
        if (streamRef.current) {
          console.log('[MRZScanner] Stopping camera - tab hidden');
          wasPausedByVisibilityRef.current = true;
          stopScanning();
        }
      } else if (!document.hidden && wasPausedByVisibilityRef.current) {
        // Tab is now visible again
        // On desktop: auto-restart camera for better UX
        // On mobile: don't auto-restart, let user manually restart for smoother experience
        console.log('[MRZScanner] Tab visible again, mobile:', isMobileDevice);
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
      console.log('[MRZScanner] Page hide event, hasStream:', !!streamRef.current);
      if (streamRef.current) {
        console.log('[MRZScanner] Force stopping camera - pagehide');
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

  return {
    videoRef,
    canvasRef,
    isScanning,
    startScanning,
    stopScanning,
    switchCamera,
    availableCameras,
    currentCamera,
    lastResult,
    error,
  };
}
