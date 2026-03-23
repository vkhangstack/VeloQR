// Image preprocessing utilities for improved QR detection accuracy

const BLUR_THRESHOLD = 50; // Laplacian variance below this indicates motion blur or soft focus

/**
 * Adaptive contrast normalization using percentile-based histogram stretching.
 * Stretches the 2nd–98th percentile luminance range to [0, 255], ignoring outliers.
 * Improves detection in dark, overexposed, or low-contrast conditions.
 * Returns the original imageData unchanged if the image is already well-exposed.
 */
export function adaptiveNormalize(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const totalPixels = width * height;

  // Build luminance histogram using fast integer approximation of 0.299R + 0.587G + 0.114B
  const hist = new Int32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    hist[(data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8]++;
  }

  // Find 2nd and 98th percentile cutoffs for robust stretch (ignores noise and highlights)
  const lowCut = totalPixels * 0.02;
  const highCut = totalPixels * 0.98;
  let low = 0, high = 255, cumSum = 0;
  for (let i = 0; i < 256; i++) {
    cumSum += hist[i];
    if (cumSum <= lowCut) low = i;
    if (cumSum <= highCut) high = i;
  }

  // Skip if range is too narrow — image is already well-exposed
  if (high <= low + 4) return imageData;

  const scale = 255 / (high - low);
  const result = new ImageData(width, height);
  const rd = result.data;

  // Uint8ClampedArray auto-clamps to [0, 255] on assignment
  for (let i = 0; i < data.length; i += 4) {
    rd[i]     = (data[i]     - low) * scale;
    rd[i + 1] = (data[i + 1] - low) * scale;
    rd[i + 2] = (data[i + 2] - low) * scale;
    rd[i + 3] = data[i + 3];
  }

  return result;
}

/**
 * Estimates image sharpness via Laplacian variance on sparse pixel samples.
 * Samples every 4th pixel in both axes for speed (~16x faster than full scan).
 * Returns variance — higher value means sharper image. Below ~50 indicates blur.
 */
export function estimateBlur(imageData: ImageData): number {
  const { width, height, data } = imageData;
  const stride = 4;
  let sum = 0, sumSq = 0, count = 0;

  for (let y = 1; y < height - 1; y += stride) {
    for (let x = 1; x < width - 1; x += stride) {
      const c = (y * width + x) * 4;
      const t = c - width * 4;
      const b = c + width * 4;
      // Fast grayscale via integer approximation
      const gc = (data[c]     * 77 + data[c + 1] * 150 + data[c + 2] * 29) >> 8;
      const gt = (data[t]     * 77 + data[t + 1] * 150 + data[t + 2] * 29) >> 8;
      const gb = (data[b]     * 77 + data[b + 1] * 150 + data[b + 2] * 29) >> 8;
      const gl = (data[c - 4] * 77 + data[c - 3] * 150 + data[c - 2] * 29) >> 8;
      const gr = (data[c + 4] * 77 + data[c + 5] * 150 + data[c + 6] * 29) >> 8;
      const lap = Math.abs(4 * gc - gt - gb - gl - gr);
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean; // variance
}

/**
 * Light unsharp-mask sharpening to recover QR edges from mild blur.
 * Uses a lower amount (0.6) than the aggressive sharpen in Stages 2-3.
 */
export function sharpenLight(imageData: ImageData, amount = 0.6): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const rd = result.data;
  const k = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0, ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            s += data[((y + ky) * width + (x + kx)) * 4 + c] * k[ki++];
          }
        }
        rd[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(s)));
      }
      rd[(y * width + x) * 4 + 3] = 255;
    }
  }

  // Copy border pixels unchanged
  for (let x = 0; x < width; x++) {
    for (let c = 0; c < 4; c++) {
      rd[x * 4 + c] = data[x * 4 + c];
      rd[((height - 1) * width + x) * 4 + c] = data[((height - 1) * width + x) * 4 + c];
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (let c = 0; c < 4; c++) {
      rd[y * width * 4 + c] = data[y * width * 4 + c];
      rd[(y * width + width - 1) * 4 + c] = data[(y * width + width - 1) * 4 + c];
    }
  }

  return result;
}

/**
 * Combined preprocessing pipeline applied before QR decode attempts:
 * 1. Adaptive contrast normalization (content-aware, skips if already well-exposed)
 * 2. Light sharpening only when blur is detected (avoids over-processing sharp images)
 */
export function preprocessForQR(imageData: ImageData): ImageData {
  const normalized = adaptiveNormalize(imageData);
  if (estimateBlur(normalized) < BLUR_THRESHOLD) {
    return sharpenLight(normalized);
  }
  return normalized;
}
