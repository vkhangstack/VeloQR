// Performance optimization utilities

/**
 * Throttle function to limit execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, args);
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * Debounce function to delay execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * RequestAnimationFrame-based throttle for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (rafId !== null) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      func.apply(this, args);
      rafId = null;
    });
  };
}

/**
 * Optimize canvas context settings
 */
export function getOptimizedCanvasContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D | null {
  return canvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
    willReadFrequently: true,
  });
}

/**
 * Scale down image data for faster processing
 */
export function downscaleImageData(
  imageData: ImageData,
  scale: number = 0.5
): ImageData {
  const { width, height, data } = imageData;
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return imageData;
  }

  // Create temporary canvas with original size
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) {
    return imageData;
  }

  tempCtx.putImageData(imageData, 0, 0);

  // Draw scaled down
  ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, newWidth, newHeight);

  return ctx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * Check if device is low-end
 */
export function isLowEndDevice(): boolean {
  // Check hardware concurrency
  const cores = navigator.hardwareConcurrency || 2;
  if (cores <= 2) {
    return true;
  }

  // Check device memory (if available)
  const memory = (navigator as any).deviceMemory;
  if (memory && memory <= 4) {
    return true;
  }

  return false;
}

/**
 * Get recommended scan delay based on device
 */
export function getRecommendedScanDelay(): number {
  if (isLowEndDevice()) {
    return 800; // Slower devices
  }

  // Check if mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return isMobile ? 600 : 500;
}

/**
 * Get recommended video constraints based on device
 */
export function getRecommendedVideoConstraints(): MediaTrackConstraints {
  const isLowEnd = isLowEndDevice();
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isLowEnd) {
    return {
      facingMode: 'environment',
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 24, max: 24 },
    };
  }

  if (isMobile) {
    return {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    };
  }

  return {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30, max: 30 },
  };
}
