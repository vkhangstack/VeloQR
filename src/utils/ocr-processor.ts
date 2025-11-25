import { OCRResult, OCRBoundingBox } from '../types';
import { loadWasm } from './wasm-loader';

let wasmModule: any = null;

/**
 * Initialize the OCR WASM module
 */
export async function initOCRWasm(): Promise<void> {
  if (wasmModule) {
    return;
  }

  try {
    wasmModule = await loadWasm();
    console.log('OCR WASM module initialized');
  } catch (error) {
    console.error('Failed to initialize OCR WASM module:', error);
    throw new Error('Failed to initialize OCR WASM module');
  }
}

/**
 * Initialize OCR model from URL or ArrayBuffer
 */
export async function initOCRModel(modelSource: string | ArrayBuffer): Promise<void> {
  if (!wasmModule) {
    await initOCRWasm();
  }

  try {
    let modelBytes: Uint8Array;

    if (typeof modelSource === 'string') {
      // Load from URL
      const response = await fetch(modelSource);
      if (!response.ok) {
        throw new Error(`Failed to load model: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      modelBytes = new Uint8Array(buffer);
    } else {
      // Use provided ArrayBuffer
      modelBytes = new Uint8Array(modelSource);
    }

    wasmModule.init_ocr_model(modelBytes);
    console.log('OCR model initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OCR model:', error);
    throw error;
  }
}

/**
 * Perform OCR inference on image data
 */
export async function ocrInference(
  imageData: ImageData
): Promise<OCRResult> {
  if (!wasmModule) {
    await initOCRWasm();
  }

  try {
    const result = wasmModule.ocr_inference(
      new Uint8Array(imageData.data.buffer),
      imageData.width,
      imageData.height
    );
    return result as OCRResult;
  } catch (error) {
    console.error('OCR inference failed:', error);
    throw error;
  }
}

/**
 * Perform OCR on a specific region
 */
export async function ocrInferenceRegion(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<OCRResult> {
  if (!wasmModule) {
    await initOCRWasm();
  }

  try {
    const result = wasmModule.ocr_inference_region(
      new Uint8Array(imageData.data.buffer),
      imageData.width,
      imageData.height,
      x,
      y,
      width,
      height
    );
    return result as OCRResult;
  } catch (error) {
    console.error('OCR region inference failed:', error);
    throw error;
  }
}

/**
 * Detect text regions in image
 */
export async function detectTextRegions(
  imageData: ImageData
): Promise<OCRBoundingBox[]> {
  if (!wasmModule) {
    await initOCRWasm();
  }

  try {
    const regions = wasmModule.detect_text_regions(
      new Uint8Array(imageData.data.buffer),
      imageData.width,
      imageData.height
    );
    return regions as OCRBoundingBox[];
  } catch (error) {
    console.error('Text detection failed:', error);
    throw error;
  }
}

/**
 * Batch OCR inference on multiple regions
 */
export async function ocrInferenceBatch(
  imageData: ImageData,
  regions: OCRBoundingBox[]
): Promise<OCRResult[]> {
  if (!wasmModule) {
    await initOCRWasm();
  }

  try {
    const results = wasmModule.ocr_inference_batch(
      new Uint8Array(imageData.data.buffer),
      imageData.width,
      imageData.height,
      regions
    );
    return results as OCRResult[];
  } catch (error) {
    console.error('Batch OCR inference failed:', error);
    throw error;
  }
}

/**
 * Perform MRZ-specific OCR inference
 */
export async function ocrMRZInference(
  imageData: ImageData
): Promise<OCRResult> {
  if (!wasmModule) {
    await initOCRWasm();
  }

  try {
    const result = wasmModule.ocr_mrz_inference(
      new Uint8Array(imageData.data.buffer),
      imageData.width,
      imageData.height
    );
    return result as OCRResult;
  } catch (error) {
    console.error('MRZ OCR inference failed:', error);
    throw error;
  }
}

/**
 * Detect and OCR MRZ lines
 */
export async function ocrMRZLines(
  imageData: ImageData
): Promise<OCRResult[]> {
  if (!wasmModule) {
    await initOCRWasm();
  }

  try {
    const results = wasmModule.ocr_mrz_lines(
      new Uint8Array(imageData.data.buffer),
      imageData.width,
      imageData.height
    );
    return results as OCRResult[];
  } catch (error) {
    console.error('MRZ lines OCR failed:', error);
    throw error;
  }
}

/**
 * Draw OCR results on canvas
 */
export function drawOCROverlay(
  canvas: HTMLCanvasElement,
  results: OCRResult[],
  color: string = '#00ff00',
  lineWidth: number = 2
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.font = '16px Arial';
  ctx.fillStyle = color;

  results.forEach((result) => {
    if (result.bounds && result.bounds.length >= 4) {
      // Draw bounding box
      ctx.beginPath();
      ctx.moveTo(result.bounds[0][0], result.bounds[0][1]);
      for (let i = 1; i < result.bounds.length; i++) {
        ctx.lineTo(result.bounds[i][0], result.bounds[i][1]);
      }
      ctx.closePath();
      ctx.stroke();

      // Draw text
      const x = result.bounds[0][0];
      const y = result.bounds[0][1] - 5;
      ctx.fillText(result.text, x, y);
      
      // Draw confidence
      const confText = `${(result.confidence * 100).toFixed(1)}%`;
      ctx.fillText(confText, x, y + 20);
    }
  });
}

/**
 * Draw text detection boxes on canvas
 */
export function drawTextDetectionBoxes(
  canvas: HTMLCanvasElement,
  boxes: OCRBoundingBox[],
  color: string = '#ff0000',
  lineWidth: number = 2
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  boxes.forEach((box) => {
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    if (box.text) {
      ctx.font = '14px Arial';
      ctx.fillStyle = color;
      ctx.fillText(box.text, box.x, box.y - 5);
    }
  });
}

/**
 * Cleanup OCR resources
 */
export function cleanupOCR(): void {
  wasmModule = null;
}
