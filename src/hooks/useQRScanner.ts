import { useRef, useState, useCallback, useEffect } from 'react';
import { QRCodeResult, UseQRScannerOptions, UseQRScannerReturn, CameraDevice, CameraFacingMode, CameraFacing, PerformanceStats } from '../types';
import { initWasm, decodeQRFromImageData, supportsOffscreenCanvas, processVideoFrame, updateWorkerConfig, clearFrameBuffer } from '../utils/qr-processor';
import { isSafariOrIOS, isNativeDetectorUnsupportedPlatform, getSafariOptimizedConstraints, isMobile } from '../utils/browser-detection';
import { selectBestCameraDeviceId, acquireCameraStream } from '../utils/camera-manager';
import { FrameBuffer, optimizeFrameForSafari } from '../utils/performanceOptimizer';
import { preprocessForQR } from '../utils/image-preprocessor';
import { createCameraError } from '../constants/cameraErrors';
import { triggerVibrate } from '../utils/vibrate';

// While actively searching for the first QR (nothing detected recently), the
// native detector runs at ~30fps so a code is caught the instant it enters the
// frame. Once something is detected it backs off to scanDelay to avoid flooding
// the onScan callback.
const NATIVE_SEARCH_INTERVAL = 33;

// Disable the native path after this many consecutive detect() failures and fall
// back to WASM — guards against browsers that advertise support but throw.
const NATIVE_MAX_FAILURES = 3;

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
    autoSelectBestCamera = true,
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
  const lastResultTimeRef = useRef<number>(0);
  const wasPausedByVisibilityRef = useRef(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const useWorkerProcessingRef = useRef(false);
  const offscreenCanvasInitializedRef = useRef(false);
  const processingTimesRef = useRef<number[]>([]);
  const frameCountRef = useRef(0);
  const barcodeDetectorRef = useRef<any>(null);
  const useNativeDetectorRef = useRef(false);
  const nativeFailuresRef = useRef(0);
  // Bumped by stopScanning() so an in-flight startScanning() call (e.g. the
  // second invocation under React StrictMode's mount/cleanup/mount, or a rapid
  // switchCamera) can detect it's stale and bail out instead of attaching a
  // torn-down/stopped stream to the video element — which otherwise renders as
  // a blank/black frame.
  const startCallIdRef = useRef(0);

  // Initialize frame buffer if frame merging is enabled
  useEffect(() => {
    if (enableFrameMerging && !frameBufferRef.current) {
      frameBufferRef.current = new FrameBuffer(frameMergeCount);
    } else if (!enableFrameMerging && frameBufferRef.current) {
      frameBufferRef.current = null;
    }
  }, [enableFrameMerging, frameMergeCount]);

  // Update worker config when parameters change
  useEffect(() => {
    if (useWorkerProcessingRef.current && offscreenCanvasInitializedRef.current) {
      updateWorkerConfig({
        resolutionScale,
        crop,
        sharpen,
        enableFrameMerging,
        frameMergeCount,
        optimizeForSafari,
      }).catch(err => {
        console.warn('[useQRScanner] Failed to update worker config:', err);
      });
    }
  }, [resolutionScale, crop, sharpen, enableFrameMerging, frameMergeCount, optimizeForSafari]);

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

    // Adaptive throttle for maximum first-detection sensitivity: while searching
    // (nothing found in the last scanDelay window) the cheap native detector runs
    // at ~30fps so a QR is caught the moment it enters the frame; after a hit it
    // backs off to scanDelay to avoid flooding onScan. The heavier WASM pipeline
    // always uses scanDelay to keep CPU bounded.
    const now = performance.now();
    const searching = now - lastResultTimeRef.current >= scanDelay;
    const effectiveDelay = useNativeDetectorRef.current
      ? (searching ? NATIVE_SEARCH_INTERVAL : scanDelay)
      : scanDelay;
    if (now - lastScanTimeRef.current < effectiveDelay) {
      return;
    }

    isScanningRef.current = true;
    lastScanTimeRef.current = now;

    try {
      // Native path: use the browser's built-in BarcodeDetector when available.
      // On Android Chrome this maps to the platform (ML Kit-class) detector,
      // giving native-tier speed and sensitivity — markedly better on small,
      // blurry, or angled QR than the WASM decoder. Skipped when crop/sharpen are
      // set so those options keep their exact semantics via the WASM pipeline.
      if (useNativeDetectorRef.current && barcodeDetectorRef.current && !crop && !sharpen) {
        try {
          const barcodes = await barcodeDetectorRef.current.detect(video);
          nativeFailuresRef.current = 0;

          // Native detection reads the video directly, so keep the overlay canvas
          // sized to the video's intrinsic resolution — cornerPoints are in that
          // coordinate space.
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          const nativeElapsed = performance.now() - now;
          processingTimesRef.current = [...processingTimesRef.current.slice(-9), nativeElapsed];
          frameCountRef.current++;

          if (barcodes.length > 0) {
            const results: QRCodeResult[] = barcodes.map((b: any) => ({
              data: b.rawValue,
              version: 0, // BarcodeDetector does not expose QR version
              bounds: (b.cornerPoints || []).map((p: any) => [p.x, p.y] as [number, number]),
            }));
            lastResultTimeRef.current = now;
            if (vibrate) {
              triggerVibrate();
            }
            setLastResults(results);
            onScan?.(results);
          }
          return;
        } catch (nativeErr) {
          // detect() can throw transiently (frame not ready). Tolerate a few, but
          // permanently fall back to WASM if the native detector keeps failing.
          nativeFailuresRef.current += 1;
          if (nativeFailuresRef.current >= NATIVE_MAX_FAILURES) {
            useNativeDetectorRef.current = false;
            console.warn('[useQRScanner] Native BarcodeDetector unstable, falling back to WASM');
          } else {
            return;
          }
        }
      }

      // Use worker-based processing if available and OffscreenCanvas is supported
      if (useWorkerProcessingRef.current) {
        // Create ImageBitmap from video (zero-copy operation)
        const imageBitmap = await createImageBitmap(video);

        // Process in worker
        const workerStart = performance.now();
        const { results, canvasWidth, canvasHeight } = await processVideoFrame(imageBitmap, {
          enableFrameMerging,
          resolutionScale,
          crop,
          sharpen,
          optimizeForSafari,
        });
        const workerElapsed = performance.now() - workerStart;
        processingTimesRef.current = [...processingTimesRef.current.slice(-9), workerElapsed];
        frameCountRef.current++;

        // Update canvas dimensions if needed (for overlay drawing)
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
        }

        if (results.length > 0) {
          lastResultTimeRef.current = now;
          if (vibrate) {
            triggerVibrate();
          }
          setLastResults(results);
          onScan?.(results);
        }
      } else {
        // Fallback: Main thread processing
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

        // Apply pre-processing before decode:
        // Safari path: downscale + fixed contrast (tuned for Safari rendering)
        // Non-Safari path: adaptive contrast normalization + conditional light sharpening
        if (optimizeForSafari) {
          imageData = optimizeFrameForSafari(imageData);
        } else {
          imageData = preprocessForQR(imageData);
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
        const mainStart = performance.now();
        const results = await decodeQRFromImageData(imageData, { crop, sharpen });
        const mainElapsed = performance.now() - mainStart;
        processingTimesRef.current = [...processingTimesRef.current.slice(-9), mainElapsed];
        frameCountRef.current++;

        if (results.length > 0) {
          lastResultTimeRef.current = now;
          if (vibrate) {
            triggerVibrate();
          }
          setLastResults(results);
          onScan?.(results);
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      const scanError = err instanceof Error ? err : new Error('Unknown scan error');
      setError(scanError);
      onError?.(scanError);
    } finally {
      isScanningRef.current = false;
    }
  }, [isScanning, onScan, onError, enableFrameMerging, optimizeForSafari, resolutionScale, crop, sharpen, scanDelay, vibrate]);

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
    const callId = ++startCallIdRef.current;
    const isStale = () => callId !== startCallIdRef.current;

    try {
      // Initialize WASM if not already done
      if (!wasmInitializedRef.current) {
        await initWasm();
        wasmInitializedRef.current = true;

        // Check if OffscreenCanvas is supported and enable worker processing
        if (supportsOffscreenCanvas()) {
          useWorkerProcessingRef.current = true;
          console.log('[useQRScanner] OffscreenCanvas supported - using worker processing');
        } else {
          useWorkerProcessingRef.current = false;
          console.log('[useQRScanner] OffscreenCanvas not supported - using main thread processing');
        }

        // Probe for the native BarcodeDetector — near-instant, platform-backed QR
        // detection on supported browsers (notably Android Chrome). When present
        // it becomes the primary detector; WASM stays as the fallback.
        // Skipped on Safari/iOS/macOS: WebKit either lacks BarcodeDetector or
        // ships a version that fails to detect QR codes reliably.
        if (isNativeDetectorUnsupportedPlatform()) {
          console.log('[useQRScanner] Skipping native BarcodeDetector on Safari/iOS/macOS');
        } else {
          try {
            const BD = (window as any).BarcodeDetector;
            if (BD && typeof BD.getSupportedFormats === 'function') {
              const formats = await BD.getSupportedFormats();
              if (formats.includes('qr_code')) {
                barcodeDetectorRef.current = new BD({ formats: ['qr_code'] });
                useNativeDetectorRef.current = true;
                nativeFailuresRef.current = 0;
                console.log('[useQRScanner] Native BarcodeDetector active');
              }
            }
          } catch (bdErr) {
            console.warn('[useQRScanner] BarcodeDetector probe failed:', bdErr);
          }
        }
      }

      const facingMode = getFacingMode(cameraFacing || preferredCamera);

      // Build video constraints.
      // Request a high capture resolution by default: small / high-version QR
      // codes need enough pixels per module to be decodable, and 720p is often
      // too coarse. The browser clamps `ideal` to the closest the device supports,
      // and callers can still override via `videoConstraints`.
      let constraints: MediaTrackConstraints = {
        facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
        ...videoConstraints,
      };

      // Request continuous autofocus for the rear camera — the single biggest
      // win for close-range QR on phones (many devices default to a fixed/hunting
      // focus). Advertised as an "advanced" (best-effort) constraint so browsers
      // that don't support it simply ignore it instead of failing.
      if (facingMode === CameraFacingMode.ENVIRONMENT && !videoConstraints.advanced) {
        constraints.advanced = [
          { focusMode: 'continuous' } as MediaTrackConstraintSet,
        ];
      }

      // Apply Safari optimizations if enabled
      if (optimizeForSafari) {
        constraints = getSafariOptimizedConstraints(constraints);
      }

      // Request camera access FIRST - only open camera ONCE to avoid double flash.
      // acquireCameraStream relaxes constraints step-by-step so the camera opens
      // on low-res webcams and restrictive browsers instead of hard-failing.
      let stream = await acquireCameraStream(constraints);

      // This call was superseded (unmounted / stopScanning / another
      // startScanning) while getUserMedia was pending — release the camera we
      // just opened and stop, rather than attaching it below.
      if (isStale()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      // Get available cameras AFTER camera is already open (no double flash)
      const allDevices = navigator.mediaDevices.enumerateDevices
        ? await navigator.mediaDevices.enumerateDevices()
        : [];
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
      let videoTrack = stream.getVideoTracks()[0];
      let settings = videoTrack.getSettings();

      // Auto-select the best rear lens: on multi-camera phones the browser often
      // hands back the ultra-wide lens (which cannot focus on close QR codes).
      // If a better main lens exists, re-acquire with an exact deviceId.
      //
      // The original stream is stopped BEFORE requesting the replacement rather
      // than after: many Android devices (and their camera HAL) cannot hold two
      // concurrent opens to the camera hardware, even across different lens
      // deviceIds. Requesting the second stream first can silently kill the
      // first stream's track (readyState -> 'ended'), which then gets attached
      // to the video element below and renders as a blank/black frame.
      if (autoSelectBestCamera) {
        const bestDeviceId = selectBestCameraDeviceId(devices, facingMode, settings.deviceId);
        if (bestDeviceId) {
          try {
            const { facingMode: _omit, ...restConstraints } = constraints;
            stream.getTracks().forEach((track) => track.stop());
            const betterStream = await navigator.mediaDevices.getUserMedia({
              video: { ...restConstraints, deviceId: { exact: bestDeviceId } },
              audio: false,
            });
            stream = betterStream;
            streamRef.current = betterStream;
            videoTrack = stream.getVideoTracks()[0];
            settings = videoTrack.getSettings();
          } catch (selectErr) {
            // The original stream is already stopped at this point, so fall
            // back to a plain facingMode-only request to recover the camera.
            console.warn('[useQRScanner] Best-camera selection failed, reacquiring default:', selectErr);
            stream = await acquireCameraStream(constraints);
            streamRef.current = stream;
            videoTrack = stream.getVideoTracks()[0];
            settings = videoTrack.getSettings();
          }
        }
      }

      if (isStale()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

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

      // Video metadata/play involved awaits above — re-check staleness before
      // committing scanning state or touching the (possibly torn-down) video.
      if (isStale()) {
        stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current && videoRef.current.srcObject === stream) {
          videoRef.current.srcObject = null;
        }
        streamRef.current = null;
        return;
      }

      // Initialize OffscreenCanvas in worker if supported and not already initialized
      if (useWorkerProcessingRef.current && !offscreenCanvasInitializedRef.current && videoRef.current) {
        try {
          // Send initial dimensions and config to worker to create its own OffscreenCanvas
          const video = videoRef.current;
          const initialWidth = video.videoWidth;
          const initialHeight = video.videoHeight;

          await updateWorkerConfig({
            createCanvas: true,
            canvasWidth: initialWidth,
            canvasHeight: initialHeight,
            enableFrameMerging,
            frameMergeCount,
            resolutionScale,
            crop,
            sharpen,
            optimizeForSafari,
          });
          offscreenCanvasInitializedRef.current = true;
          console.log('[useQRScanner] Worker canvas initialized');
        } catch (err) {
          console.warn('[useQRScanner] Failed to initialize worker canvas, falling back to main thread:', err);
          useWorkerProcessingRef.current = false;
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
  }, [renderLoop, onError, videoConstraints, optimizeForSafari, preferredCamera, getFacingMode, enableFrameMerging, frameMergeCount, resolutionScale, crop, sharpen, autoSelectBestCamera]);

  const stopScanning = useCallback(() => {
    // Invalidate any in-flight startScanning() call so it aborts instead of
    // attaching a stream to a video element we're tearing down here.
    startCallIdRef.current += 1;

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

    // Clear worker frame buffer if using worker processing
    if (useWorkerProcessingRef.current && offscreenCanvasInitializedRef.current) {
      clearFrameBuffer().catch(err => {
        console.warn('[useQRScanner] Failed to clear worker frame buffer:', err);
      });
    }

    // Clear canvas context cache
    canvasContextRef.current = null;

    // Reset scan time and performance counters
    lastScanTimeRef.current = 0;
    lastResultTimeRef.current = 0;
    processingTimesRef.current = [];
    frameCountRef.current = 0;
  }, []);

  const switchCamera = useCallback(async (facingMode?: CameraFacing) => {
    const wasScanning = isScanning;

    // Stop current scanning
    stopScanning();

    // Reset OffscreenCanvas state so it can be reinitialized
    offscreenCanvasInitializedRef.current = false;

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
    // getCapabilities is not implemented in every browser (e.g. Firefox) — treat
    // its absence as "no flash" rather than throwing.
    if (!videoTrack || typeof videoTrack.getCapabilities !== 'function') {
      return false;
    }
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

  const getPerformanceStats = useCallback((): PerformanceStats | null => {
    const times = processingTimesRef.current;
    if (times.length === 0) return null;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return {
      avgProcessingTime: Math.round(avg),
      fps: avg > 0 ? Math.round(1000 / avg) : 0,
      isUsingWorker: useWorkerProcessingRef.current,
      frameCount: frameCountRef.current,
    };
  }, []);

  const decodeQRFromImageDataWrapper = useCallback(async (imageData: ImageData): Promise<QRCodeResult> => {
    // Initialize WASM if not already done
    if (!wasmInitializedRef.current) {
      await initWasm();
      wasmInitializedRef.current = true;
    }

    const results = await decodeQRFromImageData(imageData);
    if (results.length > 0) {
      return results[0];
    } else {
      throw new Error('No QR code found in the provided image data');
    }
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
    decodeQRFromImageData: decodeQRFromImageDataWrapper,
    getPerformanceStats,
  };
}
