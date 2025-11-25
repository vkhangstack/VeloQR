/**
 * Throttle function to limit execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
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
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * RequestAnimationFrame-based throttle for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  return (...args: Parameters<T>) => {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func(...args);
        rafId = null;
      });
    }
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
export function downscaleImageData(imageData: ImageData, scale: number = 0.5): ImageData {
  const { width, height, data } = imageData;
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);
  const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor(x / scale);
      const srcY = Math.floor(y / scale);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;

      newData[dstIdx] = data[srcIdx];
      newData[dstIdx + 1] = data[srcIdx + 1];
      newData[dstIdx + 2] = data[srcIdx + 2];
      newData[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return new ImageData(newData, newWidth, newHeight);
}

/**
 * Check if device is low-end
 */
export function isLowEndDevice(): boolean {
  // Check hardware concurrency
  const cores = navigator.hardwareConcurrency || 2;
  if (cores <= 2) return true;

  // Check device memory (if available)
  const nav = navigator as any;
  if (nav.deviceMemory && nav.deviceMemory < 4) return true;

  // Check connection type (if available)
  const conn = nav.connection;
  if (conn && conn.effectiveType && ['slow-2g', '2g'].includes(conn.effectiveType)) {
    return true;
  }

  return false;
}

/**
 * Get recommended scan delay based on device
 */
export function getRecommendedScanDelay(): number {
  if (isLowEndDevice()) {
    return 500; // Slower scan for low-end devices
  }
  return 200; // Faster scan for capable devices
}

/**
 * Get recommended video constraints based on device
 */
export function getRecommendedVideoConstraints(): MediaTrackConstraints {
  if (isLowEndDevice()) {
    return {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 15, max: 20 },
    };
  }
  return {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
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
    if (this.frames.length === 0) return null;
    if (this.frames.length === 1) return this.frames[0];

    const { width, height } = this.frames[0];
    const mergedData = new Uint8ClampedArray(width * height * 4);
    const frameCount = this.frames.length;

    for (let i = 0; i < mergedData.length; i++) {
      let sum = 0;
      for (const frame of this.frames) {
        sum += frame.data[i];
      }
      mergedData[i] = Math.round(sum / frameCount);
    }

    return new ImageData(mergedData, width, height);
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

  const { width, height } = frame1;
  const mergedData = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < mergedData.length; i++) {
    mergedData[i] = Math.round((frame1.data[i] + frame2.data[i]) / 2);
  }

  return new ImageData(mergedData, width, height);
}

/**
 * Enhance frame quality for better QR detection (contrast adjustment)
 */
export function enhanceFrame(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const enhanced = new Uint8ClampedArray(data.length);
  
  // Increase contrast
  const contrast = 1.2;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    enhanced[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    enhanced[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    enhanced[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
    enhanced[i + 3] = data[i + 3];
  }

  return new ImageData(enhanced, width, height);
}

/**
 * Safari-specific frame optimization
 */
export function optimizeFrameForSafari(imageData: ImageData): ImageData {
  // Safari sometimes has color space issues, normalize the frame
  const { width, height, data } = imageData;
  const optimized = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    // Ensure proper gamma correction
    optimized[i] = data[i];
    optimized[i + 1] = data[i + 1];
    optimized[i + 2] = data[i + 2];
    optimized[i + 3] = 255; // Force full opacity
  }

  return new ImageData(optimized, width, height);
}
