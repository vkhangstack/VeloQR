import type { WasmConfig } from '../types';
import packageJson from '../../package.json';

// WASM loading utility with multiple strategies
let wasmInstance: any = null;
let wasmInitialized = false;
let wasmConfig: WasmConfig = {};

// Default CDN configuration
const PACKAGE_NAME = packageJson.name;
const PACKAGE_VERSION = packageJson.version;


/**
 * Configure WASM to load from jsDelivr CDN
 *
 * @param version - Package version to load (e.g., '1.0.1', 'latest'). Defaults to current package version.
 *
 * @example
 * // Load from CDN with specific version
 * configureWasmFromCDN('1.0.1');
 *
 * @example
 * // Load from CDN with latest version
 * configureWasmFromCDN('latest');
 *
 * @example
 * // Load from CDN with current package version (default)
 * configureWasmFromCDN();
 */
export function configureWasmFromCDN(version?: string): void {
  const targetVersion = version || PACKAGE_VERSION;
  const baseUrl = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${targetVersion}/bundle/bin/complete`;
  configureWasm({
    wasmUrl: `${baseUrl}/veloqr_bg.wasm`,
    wasmJsUrl: `${baseUrl}/veloqr.js`,
  });
}

/**
 * Configure WASM loading with custom URLs or use CDN shortcut
 *
 * @param config - Configuration object or 'cdn' shortcut
 * @param config.wasmUrl - Full URL to the .wasm file (e.g., 'https://cdn.example.com/veloqr_bg.wasm' or '/static/wasm/veloqr_bg.wasm')
 * @param config.wasmJsUrl - Full URL to the .js wrapper file (optional, defaults to same directory as wasmUrl)
 * @param config.version - Package version when using CDN (optional, defaults to current version)
 *
 * @example
 * // Load from jsDelivr CDN (shortcut)
 * configureWasm('cdn');
 *
 * @example
 * // Load from jsDelivr CDN with specific version
 * configureWasm({ version: '1.0.1' });
 *
 * @example
 * // Load from custom CDN
 * configureWasm({
 *   wasmUrl: 'https://cdn.example.com/bundle/bin/complete/veloqr_bg.wasm',
 *   wasmJsUrl: 'https://cdn.example.com/bundle/bin/complete/veloqr.js'
 * });
 *
 * @example
 * // Load from public directory
 * configureWasm({
 *   wasmUrl: '/wasm/veloqr_bg.wasm',
 *   wasmJsUrl: '/wasm/veloqr.js'
 * });
 */
export function configureWasm(config: WasmConfig | 'cdn'): void {
  if (config === 'cdn') {
    configureWasmFromCDN();
    return;
  }

  if (config.version && !config.wasmUrl) {
    // If only version is specified, use jsDelivr CDN
    configureWasmFromCDN(config.version);
    return;
  }

  wasmConfig = { ...config };
  // Reset initialization to force reload with new config
  wasmInitialized = false;
  wasmInstance = null;
}

/**
 * Reset WASM configuration and instance
 */
export function resetWasm(): void {
  wasmConfig = {};
  wasmInitialized = false;
  wasmInstance = null;
}

/**
 * Get current WASM configuration
 */
export function getWasmConfig(): WasmConfig {
  // If no config specified, return default CDN config
  if (!wasmConfig.wasmUrl) {
    const targetVersion = PACKAGE_VERSION;
    const baseUrl = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${targetVersion}/bundle/bin/complete`;
    return {
      wasmUrl: `${baseUrl}/veloqr_bg.wasm`,
      wasmJsUrl: `${baseUrl}/veloqr.js`,
    };
  }
  return { ...wasmConfig };
}

export async function loadWasm(): Promise<any> {
  if (wasmInitialized && wasmInstance) {
    return wasmInstance;
  }

  // If no config specified, default to CDN
  if (!wasmConfig.wasmUrl) {
    configureWasmFromCDN();
  }

  // Load from configured URL
  try {
    console.log('Attempting to load WASM from:', wasmConfig.wasmUrl);

    // Fetch the WASM file
    const wasmResponse = await fetch(wasmConfig.wasmUrl!);
    if (!wasmResponse.ok) {
      throw new Error(`HTTP ${wasmResponse.status}: ${wasmResponse.statusText}`);
    }

    // Verify content type
    const contentType = wasmResponse.headers.get('content-type');
    if (contentType && !contentType.includes('application/wasm') && !contentType.includes('application/octet-stream')) {
      console.warn(`Warning: WASM file served with content-type: ${contentType}. Expected 'application/wasm' or 'application/octet-stream'`);
    }

    const wasmBytes = await wasmResponse.arrayBuffer();

    // Verify this is actually a WASM file (check magic bytes)
    const magicBytes = new Uint8Array(wasmBytes.slice(0, 4));
    if (magicBytes[0] !== 0x00 || magicBytes[1] !== 0x61 || magicBytes[2] !== 0x73 || magicBytes[3] !== 0x6d) {
      throw new Error('Invalid WASM file: Magic bytes do not match. The file may be served incorrectly (possibly as HTML).');
    }

    // Fetch and execute the JS wrapper
    if (!wasmConfig.wasmJsUrl) {
      throw new Error('wasmJsUrl is required');
    }

    const jsResponse = await fetch(wasmConfig.wasmJsUrl);
    if (!jsResponse.ok) {
      throw new Error(`Failed to load JS wrapper: HTTP ${jsResponse.status}`);
    }

    // Execute the JS wrapper code
    const jsCode = await jsResponse.text();
    const wasmModule = await executeWasmJs(jsCode, wasmBytes);

    wasmInstance = wasmModule;
    wasmInitialized = true;
    console.log('WASM loaded successfully from:', wasmConfig.wasmUrl);
    return wasmModule;
  } catch (error) {
    console.error('Failed to load WASM:', error);
    throw new Error(
      'Failed to load WASM module.\n' +
      'Error: ' + (error as Error).message + '\n\n' +
      'Please ensure:\n' +
      '1. The WASM URL is correct and accessible\n' +
      '2. Your server serves .wasm files with correct MIME type (application/wasm)\n' +
      '3. CORS is properly configured if loading from a different origin\n\n' +
      'By default, WASM loads from jsDelivr CDN.\n' +
      'To use a custom location, call configureWasm() before using the scanner:\n\n' +
      'Example:\n' +
      'import { configureWasm } from "@vkhangstack/veloqr";\n' +
      'configureWasm({\n' +
      '  wasmUrl: "/wasm/veloqr_bg.wasm",\n' +
      '  wasmJsUrl: "/wasm/veloqr.js"\n' +
      '});'
    );
  }
}

// Execute WASM JS wrapper code using Function constructor
async function executeWasmJs(jsCode: string, wasmBytes: ArrayBuffer): Promise<any> {
  // Wrap the WASM JS code to export it properly
  const wrappedCode = `
    ${jsCode}
    return {
      default: init,
      decode_qr_from_image,
      __wbg_set_wasm
    };
  `;

  try {
    // Create a function that returns the WASM module
    const moduleFactory = new Function('WebAssembly', wrappedCode);
    const wasmModule = moduleFactory(WebAssembly);

    // Initialize with WASM bytes
    await wasmModule.default(wasmBytes);

    return wasmModule;
  } catch (error) {
    // If Function constructor fails, try dynamic import as fallback
    const blob = new Blob([jsCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      const dynamicModule = await (new Function('url', 'return import(url)'))(blobUrl);
      await dynamicModule.default(wasmBytes);
      URL.revokeObjectURL(blobUrl);
      return dynamicModule;
    } catch (fallbackError) {
      URL.revokeObjectURL(blobUrl);
      throw fallbackError;
    }
  }
}
