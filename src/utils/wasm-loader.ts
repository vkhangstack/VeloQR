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

export async function loadWasm(): Promise<any> {
  if (wasmInitialized && wasmInstance) {
    return wasmInstance;
  }

  // Strategy 1: Try custom configured URL (highest priority)
  if (wasmConfig.wasmUrl) {
    try {
      console.log('Attempting to load WASM from configured URL:', wasmConfig.wasmUrl);

      // Fetch the WASM file
      const response = await fetch(wasmConfig.wasmUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Verify content type
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/wasm') && !contentType.includes('application/octet-stream')) {
        console.warn(`Warning: WASM file served with content-type: ${contentType}. Expected 'application/wasm' or 'application/octet-stream'`);
      }

      const wasmBytes = await response.arrayBuffer();

      // Verify this is actually a WASM file (check magic bytes)
      const magicBytes = new Uint8Array(wasmBytes.slice(0, 4));
      if (magicBytes[0] !== 0x00 || magicBytes[1] !== 0x61 || magicBytes[2] !== 0x73 || magicBytes[3] !== 0x6d) {
        throw new Error('Invalid WASM file: Magic bytes do not match. The file may be served incorrectly (possibly as HTML).');
      }

      // Load the JS wrapper
      let wasmModule;
      if (wasmConfig.wasmJsUrl) {
        // Dynamic import from custom URL requires special handling
        wasmModule = await import(/* @vite-ignore */ wasmConfig.wasmJsUrl);
      } else {
        // Default to relative import
        wasmModule = await import('../../rust-qr/pkg/veloqr.js');
      }

      await wasmModule.default(wasmBytes);
      wasmInstance = wasmModule;
      wasmInitialized = true;
      console.log('WASM loaded successfully from configured URL');
      return wasmModule;
    } catch (error) {
      console.error('Failed to load WASM from configured URL:', error);
      throw new Error(
        'Failed to load WASM from configured URL.\n' +
        'Error: ' + (error as Error).message + '\n\n' +
        'Please ensure:\n' +
        '1. The WASM URL is correct and accessible\n' +
        '2. Your server serves .wasm files with correct MIME type (application/wasm)\n' +
        '3. CORS is properly configured if loading from a different origin'
      );
    }
  }

  // Strategy 2: Try direct import (works with Vite in dev mode)
  try {
    const wasmModule = await import('../../rust-qr/pkg/veloqr.js');
    await wasmModule.default();
    wasmInstance = wasmModule;
    wasmInitialized = true;
    console.log('WASM loaded via direct import');
    return wasmModule;
  } catch (error) {
    console.warn('Direct import failed, trying alternative methods...', error);
  }

  // Strategy 3: Try loading from public directory (works in production)
  try {
    const wasmUrl = new URL('../../rust-qr/pkg/veloqr_bg.wasm', import.meta.url);
    const wasmModule = await import('../../rust-qr/pkg/veloqr.js');

    const response = await fetch(wasmUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const wasmBytes = await response.arrayBuffer();
    await wasmModule.default(wasmBytes);

    wasmInstance = wasmModule;
    wasmInitialized = true;
    console.log('WASM loaded via URL import');
    return wasmModule;
  } catch (error) {
    console.warn('URL import failed, trying fetch fallback...', error);
  }

  // Strategy 4: Try fetching from public path
  try {
    const response = await fetch('/rust-qr/pkg/veloqr_bg.wasm');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const wasmBytes = await response.arrayBuffer();
    const wasmModule = await import('../../rust-qr/pkg/veloqr.js');
    await wasmModule.default(wasmBytes);

    wasmInstance = wasmModule;
    wasmInitialized = true;
    console.log('WASM loaded from public path');
    return wasmModule;
  } catch (error) {
    console.error('All WASM loading strategies failed:', error);
    throw new Error(
      'Failed to load WASM module. Please ensure:\n' +
      '1. The rust-qr/pkg directory is built (run: npm run build:wasm)\n' +
      '2. WASM files are accessible to your bundler\n' +
      '3. Your server serves .wasm files with correct MIME type (application/wasm)\n' +
      '4. Or use configureWasm() to specify a custom WASM URL\n\n' +
      'Example:\n' +
      'import { configureWasm } from "veloqr";\n' +
      'configureWasm({ wasmUrl: "/path/to/veloqr_bg.wasm" });\n\n' +
      'Error: ' + (error as Error).message
    );
  }
}
