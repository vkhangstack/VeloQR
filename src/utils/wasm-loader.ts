import type { WasmConfig } from '../types';

// WASM loading utility with multiple strategies
let wasmInstance: any = null;
let wasmInitialized = false;
let wasmConfig: WasmConfig = {};

/**
 * Configure WASM loading with custom URLs
 *
 * @param config - Configuration object
 * @param config.wasmUrl - Full URL to the .wasm file (e.g., 'https://cdn.example.com/veloqr_bg.wasm' or '/static/wasm/veloqr_bg.wasm')
 * @param config.wasmJsUrl - Full URL to the .js wrapper file (optional, defaults to same directory as wasmUrl)
 *
 * @example
 * // Load from CDN
 * configureWasm({
 *   wasmUrl: 'https://cdn.example.com/rust-qr/pkg/veloqr_bg.wasm',
 *   wasmJsUrl: 'https://cdn.example.com/rust-qr/pkg/veloqr.js'
 * });
 *
 * @example
 * // Load from public directory
 * configureWasm({
 *   wasmUrl: '/rust-qr/pkg/veloqr_bg.wasm'
 * });
 */
export function configureWasm(config: WasmConfig): void {
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
