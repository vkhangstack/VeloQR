import { QRCodeResult, WorkerConfig } from '../types';
import { loadWasm, getWasmConfig } from './wasm-loader';
import { WorkerHelper } from './worker-helper';
import packageJson from '../../package.json';

const PACKAGE_NAME = packageJson.name;
const PACKAGE_VERSION = packageJson.version;
let wasmModule: any = null;
let workerHelper: WorkerHelper | null = null;
let lastScanTime = 0;
const MIN_SCAN_INTERVAL = 100; // Minimum 100ms between scans
let useWorker = false;
let workerConfig: WorkerConfig = {};

/**
 * Configure Worker to load from jsDelivr CDN
 *
 * @param version - Package version to load (e.g., '1.0.1', 'latest'). Defaults to current package version.
 *
 * @example
 * // Load from CDN with specific version
 * configureWorkerFromCDN('1.0.1');
 *
 * @example
 * // Load from CDN with latest version
 * configureWorkerFromCDN('latest');
 *
 * @example
 * // Load from CDN with current package version (default)
 * configureWorkerFromCDN();
 */
export function configureWorkerFromCDN(version?: string): void {
  const targetVersion = version || PACKAGE_VERSION;
  const baseUrl = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${targetVersion}/bundle/bin/complete`;
  workerConfig = {
    workerUrl: `${baseUrl}/worker.js`,
  };
}

/**
 * Configure worker mode with custom URL or use CDN shortcut
 *
 * @param enabled - Enable or disable worker mode
 * @param config - Configuration object or 'cdn' shortcut
 * @param config.workerUrl - Full URL to the worker.js file (e.g., 'https://cdn.example.com/worker.js' or '/static/worker.js')
 * @param config.version - Package version when using CDN (optional, defaults to current version)
 *
 * @example
 * // Enable worker with jsDelivr CDN (shortcut)
 * configureWorker(true, 'cdn');
 *
 * @example
 * // Enable worker with jsDelivr CDN with specific version
 * configureWorker(true, { version: '1.0.1' });
 *
 * @example
 * // Enable worker with custom CDN
 * configureWorker(true, {
 *   workerUrl: 'https://cdn.example.com/bundle/bin/complete/worker.js'
 * });
 *
 * @example
 * // Enable worker from public directory
 * configureWorker(true, {
 *   workerUrl: '/worker.js'
 * });
 *
 * @example
 * // Disable worker mode
 * configureWorker(false);
 */
export function configureWorker(enabled: boolean, config?: WorkerConfig | 'cdn'): void {
  useWorker = enabled;

  if (enabled && config) {
    if (config === 'cdn') {
      configureWorkerFromCDN();
    } else if (config.version && !config.workerUrl) {
      // If only version is specified, use jsDelivr CDN
      configureWorkerFromCDN(config.version);
    } else {
      workerConfig = { ...config };
    }
  }

  if (!enabled && workerHelper) {
    workerHelper.terminate();
    workerHelper = null;
  }
}

/**
 * Get current Worker configuration
 */
export function getWorkerConfig(): WorkerConfig & { enabled: boolean } {
  // If no config specified, return default CDN config
  if (!workerConfig.workerUrl) {
    const targetVersion = PACKAGE_VERSION;
    const baseUrl = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${targetVersion}/bundle/bin/complete`;
    return {
      workerUrl: `${baseUrl}/worker.js`,
      enabled: useWorker,
    };
  }
  return { ...workerConfig, enabled: useWorker };
}

export async function initWasm(): Promise<void> {
  if (useWorker) {
    // Initialize worker
    if (!workerHelper) {
      const wasmCfg = getWasmConfig();
      const workerCfg = getWorkerConfig();

      // Convert relative URLs to absolute
      const makeAbsolute = (url: string) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        return new URL(url, window.location.origin).href;
      };

      workerHelper = new WorkerHelper();
      await workerHelper.init(
        workerCfg.workerUrl!,
        makeAbsolute(wasmCfg.wasmUrl!),
        makeAbsolute(wasmCfg.wasmJsUrl!)
      );
      console.log('Worker initialized successfully');
    }
  } else {
    // Initialize WASM on main thread
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
}

export async function decodeQRFromImageData(
  imageData: ImageData
): Promise<QRCodeResult[]> {
  // Throttle calls to prevent overload
  const now = Date.now();
  if (now - lastScanTime < MIN_SCAN_INTERVAL) {
    return [];
  }
  lastScanTime = now;

  if (useWorker) {
    // Use worker
    if (!workerHelper) {
      await initWasm();
    }

    try {
      // Clone imageData since it will be transferred
      const clonedData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );
      const results = await workerHelper!.decode(clonedData);
      return results;
    } catch (error) {
      console.error('QR decoding error (worker):', error);
      return [];
    }
  } else {
    // Use main thread
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
}

/**
 * Cleanup resources
 */
export function cleanup(): void {
  if (workerHelper) {
    workerHelper.terminate();
    workerHelper = null;
  }
  wasmModule = null;
}

export function drawQROverlay(
  canvas: HTMLCanvasElement,
  results: QRCodeResult[],
  highlightColor: string = '#00ff00',
  borderWidth: number = 3
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear the entire canvas before drawing new overlay
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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
