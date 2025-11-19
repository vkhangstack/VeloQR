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

export function isSafariOrIOS(): boolean {
  return isSafari() || isIOS();
}

export function isMobile() : boolean {
  return /iPad|iPhone|iPod|Android/.test(navigator.userAgent)
}

export function getSafariOptimizedConstraints(baseConstraints: MediaTrackConstraints): MediaTrackConstraints {
  if (!isSafariOrIOS()) {
    return baseConstraints;
  }

  // Safari optimization: Lower resolution for better performance
  return {
    ...baseConstraints,
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 24, max: 30 }, // Lower frame rate for Safari
  };
}
