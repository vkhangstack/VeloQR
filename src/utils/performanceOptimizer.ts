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

/**
 * Frame buffer for temporal merging (averaging multiple frames)
 */
export class FrameBuffer {
  private frames: ImageData[] = [];
  private maxFrames: number;

  constructor(maxFrames: number = 3) {
    this.maxFrames = maxFrames;
  }

  /**
   * Add a frame to the buffer
   */
  addFrame(frame: ImageData): void {
    this.frames.push(frame);
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }

  /**
   * Get merged frame by averaging all frames in buffer
   */
  getMergedFrame(): ImageData | null {
    if (this.frames.length === 0) {
      return null;
    }

    if (this.frames.length === 1) {
      return this.frames[0];
    }

    const { width, height } = this.frames[0];
    const merged = new ImageData(width, height);
    const frameCount = this.frames.length;

    // Average pixel values across all frames
    for (let i = 0; i < merged.data.length; i++) {
      let sum = 0;
      for (let f = 0; f < frameCount; f++) {
        sum += this.frames[f].data[i];
      }
      merged.data[i] = Math.round(sum / frameCount);
    }

    return merged;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.frames = [];
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.frames.length >= this.maxFrames;
  }
}

/**
 * Merge two frames from different cameras (simple average blend)
 */
export function mergeTwoFrames(frame1: ImageData, frame2: ImageData): ImageData {
  if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
    throw new Error('Frames must have the same dimensions');
  }

  const merged = new ImageData(frame1.width, frame1.height);

  for (let i = 0; i < merged.data.length; i++) {
    merged.data[i] = Math.round((frame1.data[i] + frame2.data[i]) / 2);
  }

  return merged;
}

/**
 * Enhance frame quality for better QR detection (contrast adjustment)
 */
export function enhanceFrame(imageData: ImageData): ImageData {
  const enhanced = new ImageData(imageData.width, imageData.height);
  const data = imageData.data;
  const enhancedData = enhanced.data;

  // Simple contrast enhancement
  const contrastFactor = 1.5;
  const intercept = 128 * (1 - contrastFactor);

  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast to RGB channels
    enhancedData[i] = Math.max(0, Math.min(255, data[i] * contrastFactor + intercept));
    enhancedData[i + 1] = Math.max(0, Math.min(255, data[i + 1] * contrastFactor + intercept));
    enhancedData[i + 2] = Math.max(0, Math.min(255, data[i + 2] * contrastFactor + intercept));
    enhancedData[i + 3] = data[i + 3]; // Alpha channel
  }

  return enhanced;
}

/**
 * Safari-specific frame optimization
 */
export function optimizeFrameForSafari(imageData: ImageData): ImageData {
  // Safari benefits from lower resolution and enhanced contrast
  const downscaled = downscaleImageData(imageData, 0.75);
  return enhanceFrame(downscaled);
}
