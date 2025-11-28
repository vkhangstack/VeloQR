/**
 * Cache Management Utilities
 * Provides user-facing API for managing WASM cache
 */

import { getWasmCacheManager, type WasmCacheConfig } from './wasm-cache';
import { getServiceWorkerManager, type ServiceWorkerConfig } from './service-worker-manager';

export interface CacheOptions {
  /**
   * Enable or disable caching
   */
  enabled?: boolean;

  /**
   * Cache version (used for cache name)
   */
  version?: string;

  /**
   * Maximum age of cache in milliseconds
   * Default: 7 days
   */
  maxAge?: number;

  /**
   * Service worker configuration
   */
  serviceWorker?: ServiceWorkerConfig;
}

export interface CacheInfo {
  /**
   * Whether cache is supported in current browser
   */
  supported: boolean;

  /**
   * Whether cache exists
   */
  exists: boolean;

  /**
   * Number of cached entries
   */
  size?: number;

  /**
   * List of cached URLs
   */
  entries?: string[];

  /**
   * Cache creation/update timestamp
   */
  timestamp?: number;
}

/**
 * Initialize cache system with options
 */
export async function initializeCache(options: CacheOptions = {}): Promise<boolean> {
  try {
    const cacheManager = getWasmCacheManager({
      version: options.version,
      maxAge: options.maxAge
    });

    if (!cacheManager.isSupported()) {
      console.warn('[CacheManagement] Cache API not supported in this browser');
      return false;
    }

    console.log('[CacheManagement] Cache initialized');
    return true;
  } catch (error) {
    console.error('[CacheManagement] Failed to initialize cache:', error);
    return false;
  }
}

/**
 * Preload WASM files into cache
 * Call this early in your app lifecycle to ensure offline support
 *
 * @param wasmUrl - URL to WASM file
 * @param wasmJsUrl - URL to WASM JS wrapper
 *
 * @example
 * ```ts
 * import { preloadWasmCache } from '@vkhangstack/veloqr';
 *
 * // Preload from CDN
 * await preloadWasmCache(
 *   'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr_bg.wasm',
 *   'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr.js'
 * );
 *
 * // Or from local files
 * await preloadWasmCache(
 *   '/wasm/veloqr_bg.wasm',
 *   '/wasm/veloqr.js'
 * );
 * ```
 */
export async function preloadWasmCache(
  wasmUrl: string,
  wasmJsUrl: string
): Promise<boolean> {
  try {
    const cacheManager = getWasmCacheManager();

    if (!cacheManager.isSupported()) {
      console.warn('[CacheManagement] Cache API not supported');
      return false;
    }

    console.log('[CacheManagement] Preloading WASM files...');
    const success = await cacheManager.preload(wasmUrl, wasmJsUrl);

    if (success) {
      console.log('[CacheManagement] WASM files preloaded successfully');
    } else {
      console.warn('[CacheManagement] Failed to preload WASM files');
    }

    return success;
  } catch (error) {
    console.error('[CacheManagement] Preload failed:', error);
    return false;
  }
}

/**
 * Check if WASM files are cached
 */
export async function isWasmCached(
  wasmUrl: string,
  wasmJsUrl: string
): Promise<boolean> {
  try {
    const cacheManager = getWasmCacheManager();
    return await cacheManager.isCached(wasmUrl, wasmJsUrl);
  } catch (error) {
    console.error('[CacheManagement] Failed to check cache:', error);
    return false;
  }
}

/**
 * Clear all cached WASM files
 *
 * @example
 * ```ts
 * import { clearWasmCache } from '@vkhangstack/veloqr';
 *
 * const cleared = await clearWasmCache();
 * if (cleared) {
 *   console.log('Cache cleared successfully');
 * }
 * ```
 */
export async function clearWasmCache(): Promise<boolean> {
  try {
    const cacheManager = getWasmCacheManager();
    const success = await cacheManager.clearCache();

    if (success) {
      console.log('[CacheManagement] Cache cleared successfully');
    }

    return success;
  } catch (error) {
    console.error('[CacheManagement] Failed to clear cache:', error);
    return false;
  }
}

/**
 * Get information about cached WASM files
 *
 * @example
 * ```ts
 * import { getWasmCacheInfo } from '@vkhangstack/veloqr';
 *
 * const info = await getWasmCacheInfo();
 * console.log('Cache supported:', info.supported);
 * console.log('Cache exists:', info.exists);
 * console.log('Cached files:', info.entries);
 * ```
 */
export async function getWasmCacheInfo(): Promise<CacheInfo> {
  try {
    const cacheManager = getWasmCacheManager();

    if (!cacheManager.isSupported()) {
      return { supported: false, exists: false };
    }

    const info = await cacheManager.getCacheInfo();
    return {
      supported: true,
      ...info
    };
  } catch (error) {
    console.error('[CacheManagement] Failed to get cache info:', error);
    return { supported: false, exists: false };
  }
}

/**
 * Force update cached WASM files
 * Useful when you want to refresh cache with new version
 *
 * @example
 * ```ts
 * import { updateWasmCache } from '@vkhangstack/veloqr';
 *
 * await updateWasmCache(
 *   'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@latest/bundle/bin/complete/veloqr_bg.wasm',
 *   'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@latest/bundle/bin/complete/veloqr.js'
 * );
 * ```
 */
export async function updateWasmCache(
  wasmUrl: string,
  wasmJsUrl: string
): Promise<boolean> {
  try {
    const cacheManager = getWasmCacheManager();
    await cacheManager.updateCache(wasmUrl, wasmJsUrl);
    console.log('[CacheManagement] Cache updated successfully');
    return true;
  } catch (error) {
    console.error('[CacheManagement] Failed to update cache:', error);
    return false;
  }
}

/**
 * Register service worker for advanced caching
 * Service worker provides additional caching strategies
 *
 * @param scriptUrl - URL to service worker script (default: '/service-worker.js')
 * @param config - Service worker configuration
 *
 * @example
 * ```ts
 * import { registerServiceWorker } from '@vkhangstack/veloqr';
 *
 * const registered = await registerServiceWorker('/service-worker.js');
 * if (registered) {
 *   console.log('Service worker registered');
 * }
 * ```
 */
export async function registerServiceWorker(
  scriptUrl: string = '/service-worker.js',
  config?: ServiceWorkerConfig
): Promise<boolean> {
  try {
    const swManager = getServiceWorkerManager(config);

    if (!swManager.isSupported()) {
      console.warn('[CacheManagement] Service Worker not supported');
      return false;
    }

    const registration = await swManager.register(scriptUrl);
    return registration !== null;
  } catch (error) {
    console.error('[CacheManagement] Failed to register service worker:', error);
    return false;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  try {
    const swManager = getServiceWorkerManager();
    return await swManager.unregister();
  } catch (error) {
    console.error('[CacheManagement] Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Get service worker status
 */
export function getServiceWorkerStatus(): {
  supported: boolean;
  registered: boolean;
  active: boolean;
} {
  const swManager = getServiceWorkerManager();
  return swManager.getStatus();
}
