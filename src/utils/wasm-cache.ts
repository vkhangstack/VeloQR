/**
 * WASM Cache Manager - Manages caching of WASM files using Cache API
 * Provides offline support for WASM modules
 */

export interface WasmCacheConfig {
  cacheName?: string;
  version?: string;
  maxAge?: number; // milliseconds
}

export interface CachedWasmData {
  wasmBuffer: ArrayBuffer;
  jsCode: string;
  cachedAt: number;
  urls: {
    wasmUrl: string;
    wasmJsUrl: string;
  };
}

const DEFAULT_CACHE_NAME = 'veloqr-wasm-cache';
const DEFAULT_VERSION = 'v1';
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export class WasmCacheManager {
  private cacheName: string;
  private version: string;
  private maxAge: number;

  constructor(config: WasmCacheConfig = {}) {
    this.version = config.version || DEFAULT_VERSION;
    this.cacheName = config.cacheName || `${DEFAULT_CACHE_NAME}-${this.version}`;
    this.maxAge = config.maxAge || DEFAULT_MAX_AGE;
  }

  /**
   * Check if Cache API is supported
   */
  isSupported(): boolean {
    return typeof caches !== 'undefined' && 'open' in caches;
  }

  /**
   * Check if a URL is cached and still valid
   */
  async isCached(wasmUrl: string, wasmJsUrl: string): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const cache = await caches.open(this.cacheName);
      const [wasmResponse, jsResponse] = await Promise.all([
        cache.match(wasmUrl),
        cache.match(wasmJsUrl)
      ]);

      if (!wasmResponse || !jsResponse) {
        return false;
      }

      // Check if cache is expired
      const cachedAt = parseInt(wasmResponse.headers.get('x-cached-at') || '0', 10);
      if (cachedAt && Date.now() - cachedAt > this.maxAge) {
        console.log('[WasmCache] Cache expired, will refresh');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WasmCache] Error checking cache:', error);
      return false;
    }
  }

  /**
   * Load WASM files from cache
   */
  async loadFromCache(wasmUrl: string, wasmJsUrl: string): Promise<CachedWasmData | null> {
    if (!this.isSupported()) {
      console.log('[WasmCache] Cache API not supported');
      return null;
    }

    try {
      const cache = await caches.open(this.cacheName);
      const [wasmResponse, jsResponse] = await Promise.all([
        cache.match(wasmUrl),
        cache.match(wasmJsUrl)
      ]);

      if (!wasmResponse || !jsResponse) {
        console.log('[WasmCache] Files not found in cache');
        return null;
      }

      // Check if cache is expired
      const cachedAt = parseInt(wasmResponse.headers.get('x-cached-at') || '0', 10);
      if (cachedAt && Date.now() - cachedAt > this.maxAge) {
        console.log('[WasmCache] Cache expired');
        return null;
      }

      const [wasmBuffer, jsCode] = await Promise.all([
        wasmResponse.arrayBuffer(),
        jsResponse.text()
      ]);

      console.log('[WasmCache] Loaded from cache:', { wasmUrl, wasmJsUrl });

      return {
        wasmBuffer,
        jsCode,
        cachedAt: cachedAt || Date.now(),
        urls: { wasmUrl, wasmJsUrl }
      };
    } catch (error) {
      console.error('[WasmCache] Error loading from cache:', error);
      return null;
    }
  }

  /**
   * Cache WASM files with metadata
   */
  async cacheWasmFiles(
    wasmUrl: string,
    wasmJsUrl: string,
    wasmBuffer: ArrayBuffer,
    jsCode: string
  ): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[WasmCache] Cache API not supported, skipping cache');
      return false;
    }

    try {
      const cache = await caches.open(this.cacheName);
      const cachedAt = Date.now().toString();

      // Create Response objects with metadata headers
      const wasmResponse = new Response(wasmBuffer, {
        headers: {
          'Content-Type': 'application/wasm',
          'x-cached-at': cachedAt,
          'x-cache-version': this.version
        }
      });

      const jsResponse = new Response(jsCode, {
        headers: {
          'Content-Type': 'application/javascript',
          'x-cached-at': cachedAt,
          'x-cache-version': this.version
        }
      });

      // Store in cache
      await Promise.all([
        cache.put(wasmUrl, wasmResponse),
        cache.put(wasmJsUrl, jsResponse)
      ]);

      console.log('[WasmCache] Files cached successfully:', { wasmUrl, wasmJsUrl });
      return true;
    } catch (error) {
      console.error('[WasmCache] Error caching files:', error);
      return false;
    }
  }

  /**
   * Fetch and cache WASM files
   */
  async fetchAndCache(wasmUrl: string, wasmJsUrl: string): Promise<CachedWasmData> {
    console.log('[WasmCache] Fetching from network:', { wasmUrl, wasmJsUrl });

    // Fetch from network
    const [wasmResponse, jsResponse] = await Promise.all([
      fetch(wasmUrl),
      fetch(wasmJsUrl)
    ]);

    if (!wasmResponse.ok) {
      throw new Error(`Failed to fetch WASM: ${wasmResponse.status} ${wasmResponse.statusText}`);
    }

    if (!jsResponse.ok) {
      throw new Error(`Failed to fetch WASM JS: ${jsResponse.status} ${jsResponse.statusText}`);
    }

    const [wasmBuffer, jsCode] = await Promise.all([
      wasmResponse.arrayBuffer(),
      jsResponse.text()
    ]);

    // Verify WASM magic bytes
    const magicBytes = new Uint8Array(wasmBuffer.slice(0, 4));
    if (magicBytes[0] !== 0x00 || magicBytes[1] !== 0x61 ||
      magicBytes[2] !== 0x73 || magicBytes[3] !== 0x6d) {
      throw new Error('Invalid WASM file: Magic bytes do not match');
    }

    // Cache the files
    await this.cacheWasmFiles(wasmUrl, wasmJsUrl, wasmBuffer, jsCode);

    return {
      wasmBuffer,
      jsCode,
      cachedAt: Date.now(),
      urls: { wasmUrl, wasmJsUrl }
    };
  }

  /**
   * Load WASM with cache-first strategy
   */
  async loadWasm(wasmUrl: string, wasmJsUrl: string): Promise<CachedWasmData> {
    // Try cache first
    const cached = await this.loadFromCache(wasmUrl, wasmJsUrl);
    if (cached) {
      console.log('[WasmCache] Using cached version');
      return cached;
    }

    // Fallback to network
    console.log('[WasmCache] Cache miss, fetching from network');
    return this.fetchAndCache(wasmUrl, wasmJsUrl);
  }

  /**
   * Clear all cached WASM files
   */
  async clearCache(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const deleted = await caches.delete(this.cacheName);
      if (deleted) {
        console.log('[WasmCache] Cache cleared successfully');
      }
      return deleted;
    } catch (error) {
      console.error('[WasmCache] Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Get cache information
   */
  async getCacheInfo(): Promise<{
    exists: boolean;
    size?: number;
    entries?: string[];
  }> {
    if (!this.isSupported()) {
      return { exists: false };
    }

    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();

      return {
        exists: keys.length > 0,
        size: keys.length,
        entries: keys.map(req => req.url)
      };
    } catch (error) {
      console.error('[WasmCache] Error getting cache info:', error);
      return { exists: false };
    }
  }

  /**
   * Update cached files (force refresh from network)
   */
  async updateCache(wasmUrl: string, wasmJsUrl: string): Promise<CachedWasmData> {
    console.log('[WasmCache] Force updating cache from network');

    // Remove old cache entries
    if (this.isSupported()) {
      try {
        const cache = await caches.open(this.cacheName);
        await Promise.all([
          cache.delete(wasmUrl),
          cache.delete(wasmJsUrl)
        ]);
      } catch (error) {
        console.error('[WasmCache] Error removing old cache:', error);
      }
    }

    // Fetch and cache new version
    return this.fetchAndCache(wasmUrl, wasmJsUrl);
  }

  /**
   * Preload and cache WASM files
   */
  async preload(wasmUrl: string, wasmJsUrl: string): Promise<boolean> {
    try {
      const isCached = await this.isCached(wasmUrl, wasmJsUrl);
      if (isCached) {
        console.log('[WasmCache] Files already cached');
        return true;
      }

      await this.fetchAndCache(wasmUrl, wasmJsUrl);
      return true;
    } catch (error) {
      console.error('[WasmCache] Error preloading:', error);
      return false;
    }
  }
}

// Singleton instance
let defaultCacheManager: WasmCacheManager | null = null;

/**
 * Get or create default cache manager instance
 */
export function getWasmCacheManager(config?: WasmCacheConfig): WasmCacheManager {
  if (!defaultCacheManager) {
    defaultCacheManager = new WasmCacheManager(config);
  }
  return defaultCacheManager;
}

/**
 * Reset default cache manager (useful for testing or config changes)
 */
export function resetWasmCacheManager(): void {
  defaultCacheManager = null;
}
