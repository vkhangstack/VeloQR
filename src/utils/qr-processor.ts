import { QRCodeResult } from '../types';
import { loadWasm } from './wasm-loader';

let wasmModule: any = null;
let lastScanTime = 0;
const MIN_SCAN_INTERVAL = 100; // Minimum 100ms between scans

export async function initWasm(): Promise<void> {
  if (wasmModule) {
    return;
  }

  try {
    wasmModule = await loadWasm();
    console.log('WASM module initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WASM module:', error);
    throw new Error('Failed to initialize QR scanner: ' + (error as Error).message);
  }
}

export async function decodeQRFromImageData(
  imageData: ImageData
): Promise<QRCodeResult[]> {
  // Throttle WASM calls to prevent overload
  const now = Date.now();
  if (now - lastScanTime < MIN_SCAN_INTERVAL) {
    return [];
  }
  lastScanTime = now;

  if (!wasmModule) {
    await initWasm();
  }

  try {
    const { data, width, height } = imageData;
    const results = wasmModule.decode_qr_from_image(data, width, height);
    return results as QRCodeResult[];
  } catch (error) {
    console.error('QR decoding error:', error);
    return [];
  }
}

export function drawQROverlay(
  canvas: HTMLCanvasElement,
  results: QRCodeResult[],
  highlightColor: string = '#00ff00',
  borderWidth: number = 3
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  results.forEach((result) => {
    if (result.bounds && result.bounds.length >= 4) {
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = borderWidth;
      ctx.beginPath();

      const [x0, y0] = result.bounds[0];
      ctx.moveTo(x0, y0);

      for (let i = 1; i < result.bounds.length; i++) {
        const [x, y] = result.bounds[i];
        ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.stroke();

      // Draw a small label with the data length
      ctx.fillStyle = highlightColor;
      ctx.font = '14px monospace';
      ctx.fillText(
        `QR: ${result.data.length} chars`,
        result.bounds[0][0],
        result.bounds[0][1] - 5
      );
    }
  });
}
