/**
 * Browser detection utilities for platform-specific optimizations
 */

export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();
  const isSafariBrowser = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium');

  return isSafariBrowser;
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;

  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isMacOS(): boolean {
  if (typeof window === 'undefined') return false;

  return /Mac/.test(navigator.platform) && !isIOS();
}

export function isSafariOrIOS(): boolean {
  return isSafari() || isIOS();
}

/**
 * True on Safari (desktop or mobile) or any Apple platform (iOS/macOS).
 * WebKit's BarcodeDetector support is either absent or too unreliable for QR
 * detection, so callers use this to skip the native path and go straight to
 * the WASM decoder.
 */
export function isNativeDetectorUnsupportedPlatform(): boolean {
  return isSafari() || isIOS() || isMacOS();
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android/.test(navigator.userAgent);
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;

  return /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * `offMainThread` should be true when frame decoding runs via
 * OffscreenCanvas + Worker (Safari 16.4+) instead of blocking the main
 * thread. In that case decoding no longer competes with UI rendering, so we
 * can afford a higher-resolution capture — more pixels per QR module is the
 * single biggest lever for closing the accuracy gap with native ML-based
 * detectors. Older Safari without OffscreenCanvas support keeps the
 * conservative, lower-resolution constraints tuned for main-thread decoding.
 */
export function getSafariOptimizedConstraints(
  baseConstraints: MediaTrackConstraints,
  offMainThread: boolean = false
): MediaTrackConstraints {
  if (!isSafariOrIOS()) {
    return baseConstraints;
  }

  // NOTE: `ideal`-only constraints on purpose. Adding `max` caps here makes
  // iOS Safari throw OverconstrainedError (camera fails to open entirely) even
  // though the device supports the requested modes — the browser clamps
  // `ideal` to the closest supported resolution/frameRate anyway.
  if (offMainThread) {
    return {
      ...baseConstraints,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    };
  }

  // Safari optimization: Lower resolution for better performance
  return {
    ...baseConstraints,
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 24 }, // Lower frame rate for Safari
  };
}
