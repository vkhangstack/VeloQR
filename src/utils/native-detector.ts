// Thin wrapper around the browser-native BarcodeDetector API.
//
// When available (notably Android Chrome/Edge and Chrome desktop) it maps to the
// platform's QR detector — fast and highly sensitive, especially on small,
// blurry, or angled codes. Callers use it as the primary path and fall back to
// the WASM decoder when it is unsupported or finds nothing.

import { QRCodeResult } from '../types';
import { isNativeDetectorUnsupportedPlatform } from './browser-detection';

// Lazily-created singleton. Resolves to a BarcodeDetector instance, or null when
// the API is missing or doesn't support the qr_code format. Cached so the
// support probe runs only once per page.
let detectorPromise: Promise<any | null> | null = null;

function getDetector(): Promise<any | null> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        // Safari/iOS/macOS either lack BarcodeDetector or ship a version that
        // fails to detect QR codes reliably — skip straight to the WASM path.
        if (isNativeDetectorUnsupportedPlatform()) {
          return null;
        }
        const BD = (window as any).BarcodeDetector;
        if (!BD || typeof BD.getSupportedFormats !== 'function') {
          return null;
        }
        const formats = await BD.getSupportedFormats();
        if (!formats.includes('qr_code')) {
          return null;
        }
        return new BD({ formats: ['qr_code'] });
      } catch {
        return null;
      }
    })();
  }
  return detectorPromise;
}

/**
 * Whether the native BarcodeDetector (with qr_code support) is usable.
 */
export async function isNativeQRDetectorSupported(): Promise<boolean> {
  return (await getDetector()) !== null;
}

/**
 * Detect QR codes with the native BarcodeDetector.
 *
 * `source` may be any ImageBitmapSource (canvas, image, video, ImageBitmap,
 * Blob, ImageData). Returns `null` when the API is unavailable or the call
 * fails — signalling the caller to fall back to the WASM decoder — or an array
 * (possibly empty) when detection actually ran.
 */
export async function detectQRNative(
  source: ImageBitmapSource
): Promise<QRCodeResult[] | null> {
  const detector = await getDetector();
  if (!detector) {
    return null;
  }
  try {
    const barcodes = await detector.detect(source);
    return barcodes.map((b: any) => ({
      data: b.rawValue,
      version: 0, // BarcodeDetector does not expose QR version
      bounds: (b.cornerPoints || []).map((p: any) => [p.x, p.y] as [number, number]),
    }));
  } catch {
    return null;
  }
}
