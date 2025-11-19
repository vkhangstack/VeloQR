import { useRef, useState, useCallback, useEffect } from 'react';
import { QRCodeResult, UseQRScannerOptions, UseQRScannerReturn } from '../types';
import { initWasm, decodeQRFromImageData } from '../utils/qr-processor';

export function useQRScanner(options: UseQRScannerOptions = {}): UseQRScannerReturn {
  const { scanDelay = 500, onScan, onError } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResults, setLastResults] = useState<QRCodeResult[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const wasmInitializedRef = useRef(false);
  const isScanningRef = useRef(false);

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
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

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
  }, [isScanning, onScan, onError]);

  const startScanning = useCallback(async () => {
    try {
      // Initialize WASM if not already done
      if (!wasmInitializedRef.current) {
        await initWasm();
        wasmInitializedRef.current = true;
      }

      // Request camera access with optimized constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false,
      });

      streamRef.current = stream;

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
  }, [scan, scanDelay, onError]);

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
    lastResults,
    error,
  };
}
