import { MRZResult } from '../types';
import { loadWasm } from './wasm-loader';
import packageJson from '../../package.json';

const PACKAGE_NAME = packageJson.name;
const PACKAGE_VERSION = packageJson.version;
let wasmModule: any = null;
let lastScanTime = 0;
const MIN_SCAN_INTERVAL = 100; // Minimum 100ms between scans

/**
 * Initialize WASM and Tesseract for MRZ scanning
 */
export async function initWasm(): Promise<void> {
  if (wasmModule) {
    return;
  }

  try {
    // Initialize WASM for parsing
    if (!wasmModule) {
      wasmModule = await loadWasm();
      console.log('WASM module initialized for MRZ parsing');
    }
  } catch (error) {
    console.error('Failed to initialize MRZ scanner:', error);
    throw new Error('Failed to initialize MRZ scanner: ' + (error as Error).message);
  }
}

/**
 * Convert image to grayscale
 */
function toGrayscale(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const grayData = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    // Luminosity method: 0.299R + 0.587G + 0.114B
    const gray = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
    grayData[i] = gray;
    grayData[i + 1] = gray;
    grayData[i + 2] = gray;
    grayData[i + 3] = data[i + 3]; // Keep alpha
  }

  return new ImageData(grayData, width, height);
}

/**
 * Adjust contrast and brightness
 */
function adjustContrastBrightness(
  imageData: ImageData,
  contrast: number = 1.5,
  brightness: number = 0
): ImageData {
  const { data, width, height } = imageData;
  const adjustedData = new Uint8ClampedArray(data.length);
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    adjustedData[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128 + brightness));
    adjustedData[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128 + brightness));
    adjustedData[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128 + brightness));
    adjustedData[i + 3] = data[i + 3];
  }

  return new ImageData(adjustedData, width, height);
}

/**
 * Sharpen image for better OCR
 */
function sharpenImage(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const sharpened = new Uint8ClampedArray(data.length);

  // Sharpening kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            sum += data[idx] * kernel[kernelIdx];
          }
        }
        const idx = (y * width + x) * 4 + c;
        sharpened[idx] = Math.min(255, Math.max(0, sum));
      }
      const idx = (y * width + x) * 4;
      sharpened[idx + 3] = data[idx + 3];
    }
  }

  return new ImageData(sharpened, width, height);
}

/**
 * Upscale image for better OCR accuracy
 */
function upscaleImage(imageData: ImageData, scale: number = 2): ImageData {
  const { data, width, height } = imageData;
  const newWidth = width * scale;
  const newHeight = height * scale;
  const upscaled = new Uint8ClampedArray(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor(x / scale);
      const srcY = Math.floor(y / scale);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;

      upscaled[dstIdx] = data[srcIdx];
      upscaled[dstIdx + 1] = data[srcIdx + 1];
      upscaled[dstIdx + 2] = data[srcIdx + 2];
      upscaled[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return new ImageData(upscaled, newWidth, newHeight);
}

/**
 * Apply adaptive thresholding
 */
function applyThreshold(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const thresholdData = new Uint8ClampedArray(data.length);

  // Calculate threshold using Otsu's method
  let histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  const total = width * height;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;

    wF = total - wB;
    if (wF === 0) break;

    sumB += i * histogram[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }

  // Apply threshold
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] > threshold ? 255 : 0;
    thresholdData[i] = value;
    thresholdData[i + 1] = value;
    thresholdData[i + 2] = value;
    thresholdData[i + 3] = data[i + 3];
  }

  return new ImageData(thresholdData, width, height);
}


/**
 * Detect MRZ region using horizontal projection
 */
function detectMRZRegion(imageData: ImageData): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  bounds: [number, number, number, number];
} | null {
  const { data, width, height } = imageData;

  // Convert to grayscale for analysis
  const grayData = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    grayData[j] = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
  }

  // Calculate horizontal projection (sum of dark pixels per row)
  const projection: number[] = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (grayData[idx] < 128) {
        projection[y]++;
      }
    }
  }

  // Find text-dense regions (peaks in projection)
  const avgProjection = projection.reduce((a, b) => a + b, 0) / height;
  const threshold = avgProjection * 1.5;
  const textRows: number[] = [];

  for (let y = 0; y < height; y++) {
    if (projection[y] > threshold) {
      textRows.push(y);
    }
  }

  if (textRows.length === 0) {
    return null;
  }

  // MRZ is typically at the bottom 30-70% of the document
  const bottomThreshold = Math.floor(height * 0.3);
  const mrzRows = textRows.filter(y => y >= bottomThreshold);

  if (mrzRows.length === 0) {
    return null;
  }

  // Find continuous regions
  const regions: Array<{ start: number; end: number }> = [];
  let currentRegion = { start: mrzRows[0], end: mrzRows[0] };

  for (let i = 1; i < mrzRows.length; i++) {
    if (mrzRows[i] - currentRegion.end <= 5) {
      currentRegion.end = mrzRows[i];
    } else {
      if (currentRegion.end - currentRegion.start >= 20) {
        regions.push({ ...currentRegion });
      }
      currentRegion = { start: mrzRows[i], end: mrzRows[i] };
    }
  }

  if (currentRegion.end - currentRegion.start >= 20) {
    regions.push(currentRegion);
  }

  if (regions.length === 0) {
    return null;
  }

  // Select the bottom-most region with sufficient height (likely MRZ)
  const mrzRegion = regions[regions.length - 1];

  // Add padding
  const padding = 10;
  const y1 = Math.max(0, mrzRegion.start - padding);
  const y2 = Math.min(height, mrzRegion.end + padding);
  const regionHeight = y2 - y1;

  // Extract region
  const regionData = new Uint8ClampedArray(width * regionHeight * 4);
  for (let y = 0; y < regionHeight; y++) {
    const srcY = y1 + y;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcY * width + x) * 4;
      const dstIdx = (y * width + x) * 4;
      regionData[dstIdx] = data[srcIdx];
      regionData[dstIdx + 1] = data[srcIdx + 1];
      regionData[dstIdx + 2] = data[srcIdx + 2];
      regionData[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return {
    data: regionData,
    width: width,
    height: regionHeight,
    bounds: [0, y1, width, regionHeight],
  };
}

/**
 * Decode MRZ from image data using Tesseract OCR
 */
export async function decodeMRZFromImageData(
  imageData: ImageData
): Promise<MRZResult | null> {
  // Throttle calls to prevent overload
  const now = Date.now();
  if (now - lastScanTime < MIN_SCAN_INTERVAL) {
    return null;
  }
  lastScanTime = now;

  if (!wasmModule) {
    await initWasm();
  }

  try {
    const { data, width, height } = imageData;

    // Step 1: Preprocess image for better OCR accuracy
    console.log('Step 1: Preprocessing image...');
    let processedImage = toGrayscale(imageData);
    processedImage = sharpenImage(processedImage); // Sharpen text
    processedImage = adjustContrastBrightness(processedImage, 2.0, 10); // Higher contrast
    processedImage = applyThreshold(processedImage); // Binary threshold

    // Step 2: Detect MRZ region using JavaScript
    console.log('Step 2: Detecting MRZ region...');
    const mrzRegion = detectMRZRegion(processedImage);

    if (!mrzRegion || !mrzRegion.data) {
      console.log('No MRZ region detected, trying full image...');

      // Fallback: try full image with preprocessing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.putImageData(processedImage, 0, 0);

      // Perform OCR on full image
      console.log('Step 3: Performing OCR on full image...');
      const text: any = null;
      if (!text || text.trim().length === 0) {
        console.log('No text detected by OCR');
        return null;
      }

      // Parse MRZ text using WASM
      console.log('Step 4: Parsing MRZ...', text);
      const wasmResult = wasmModule.parse_mrz_text(text);

      console.log('OCR Result:', wasmResult);
      if (wasmResult) {
        return {
          documentType: wasmResult.document_type,
          documentNumber: wasmResult.document_number,
          dateOfBirth: wasmResult.date_of_birth,
          dateOfExpiry: wasmResult.date_of_expiry,
          nationality: wasmResult.nationality,
          sex: wasmResult.sex,
          surname: wasmResult.surname,
          givenNames: wasmResult.given_names,
          optionalData: wasmResult.optional_data,
          issuingCountry: wasmResult.issuing_country,
          rawMrz: wasmResult.raw_mrz,
          confidence: wasmResult.confidence,
        } as MRZResult;
      }

      return null;
    }

    console.log(`MRZ region found: ${mrzRegion.width}x${mrzRegion.height}`);

    // Step 3: Upscale MRZ region for better OCR accuracy
    const mrzImageData = new ImageData(
      new Uint8ClampedArray(mrzRegion.data),
      mrzRegion.width,
      mrzRegion.height
    );
    const upscaledMRZ = upscaleImage(mrzImageData, 2); // 2x upscale
    console.log(`MRZ upscaled to: ${upscaledMRZ.width}x${upscaledMRZ.height}`);

    // Step 4: Create canvas with upscaled MRZ region for OCR
    const canvas = document.createElement('canvas');
    canvas.width = upscaledMRZ.width;
    canvas.height = upscaledMRZ.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.putImageData(upscaledMRZ, 0, 0);

    // Step 5: Perform OCR using Tesseract
    console.log('Step 4: Performing OCR on upscaled MRZ region...');
    const text: any = null

    console.log('OCR Result:', text);

    if (!text || text.trim().length === 0) {
      console.log('No text detected by OCR');
      return null;
    }

    // Step 6: Parse MRZ text using WASM
    console.log('Step 5: Parsing MRZ...');
    const wasmResult = wasmModule.parse_mrz_text(text);

    if (wasmResult && mrzRegion.bounds) {
      return {
        documentType: wasmResult.document_type,
        documentNumber: wasmResult.document_number,
        dateOfBirth: wasmResult.date_of_birth,
        dateOfExpiry: wasmResult.date_of_expiry,
        nationality: wasmResult.nationality,
        sex: wasmResult.sex,
        surname: wasmResult.surname,
        givenNames: wasmResult.given_names,
        optionalData: wasmResult.optional_data,
        issuingCountry: wasmResult.issuing_country,
        rawMrz: wasmResult.raw_mrz,
        confidence: wasmResult.confidence,
        bounds: {
          x: mrzRegion.bounds[0],
          y: mrzRegion.bounds[1],
          width: mrzRegion.bounds[2],
          height: mrzRegion.bounds[3],
        },
      } as MRZResult;
    }

    return null;
  } catch (error) {
    console.error('MRZ decoding error:', error);
    return null;
  }
}

/**
 * Cleanup resources
 */
export async function cleanup(): Promise<void> {
  wasmModule = null;
}

/**
 * Draw MRZ overlay on canvas
 */
export function drawMRZOverlay(
  canvas: HTMLCanvasElement,
  result: MRZResult | null,
  highlightColor: string = '#00ff00',
  borderWidth: number = 3
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !result || !result.bounds) return;

  // Clear the entire canvas before drawing new overlay
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { x, y, width, height } = result.bounds;

  // Draw bounding box
  ctx.strokeStyle = highlightColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(x, y, width, height);

  // Draw label
  ctx.fillStyle = highlightColor;
  ctx.font = '14px monospace';
  ctx.fillText(
    `MRZ: ${result.documentType}`,
    x,
    y - 5
  );

  // Draw document info
  if (result.surname) {
    ctx.fillText(
      `${result.surname}, ${result.givenNames}`,
      x,
      y + height + 18
    );
  }
}

/**
 * Format date from MRZ format (YYMMDD) to readable format
 */
export function formatMRZDate(mrzDate: string): string {
  if (mrzDate.length !== 6) return mrzDate;

  const year = mrzDate.substring(0, 2);
  const month = mrzDate.substring(2, 4);
  const day = mrzDate.substring(4, 6);

  // Determine century (YY > 50 means 19XX, otherwise 20XX)
  const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;

  return `${fullYear}-${month}-${day}`;
}

/**
 * Validate MRZ checksum digit
 */
export function validateCheckDigit(data: string, checkDigit: string): boolean {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    let value: number;

    if (char === '<') {
      value = 0;
    } else if (char >= '0' && char <= '9') {
      value = parseInt(char);
    } else if (char >= 'A' && char <= 'Z') {
      value = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    } else {
      return false; // Invalid character
    }

    sum += value * weights[i % 3];
  }

  const calculatedCheckDigit = sum % 10;
  return calculatedCheckDigit === parseInt(checkDigit);
}

/**
 * Parse and validate MRZ result
 */
export function validateMRZ(result: MRZResult): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check document type
  if (!['TD1', 'TD2', 'TD3'].includes(result.documentType)) {
    errors.push('Invalid document type');
  }

  // Check required fields
  if (!result.documentNumber) {
    errors.push('Missing document number');
  }

  if (!result.dateOfBirth || result.dateOfBirth.length !== 6) {
    errors.push('Invalid date of birth');
  }

  if (!result.dateOfExpiry || result.dateOfExpiry.length !== 6) {
    errors.push('Invalid date of expiry');
  }

  if (!result.nationality || result.nationality.length !== 3) {
    errors.push('Invalid nationality code');
  }

  if (!result.issuingCountry || result.issuingCountry.length !== 3) {
    errors.push('Invalid issuing country code');
  }

  if (!['M', 'F', 'X', '<'].includes(result.sex)) {
    errors.push('Invalid sex indicator');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
