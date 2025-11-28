/**
 * VeloQR Service Worker
 * Handles caching of WASM files for offline support
 * author: vkhangstack
 * version: 1.2.2
 * license: MIT
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `veloqr-wasm-cache-${CACHE_VERSION}`;
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Files to cache immediately on install
const PRECACHE_URLS = [];

// WASM file patterns to cache
const WASM_PATTERNS = [
  /\.wasm$/,
  /veloqr_bg\.wasm$/,
  /veloqr\.js$/,
];

/**
 * Check if URL should be cached
 */
function shouldCache(url) {
  return WASM_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Check if response is valid
 */
function isValidResponse(response) {
  return response &&
    response.status === 200 &&
    response.type === 'basic' || response.type === 'cors';
}

/**
 * Install event - Precache essential files
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching files');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (cacheName.startsWith('veloqr-wasm-cache-') && cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - Cache-first strategy for WASM files
 */
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Only cache WASM-related files
  if (!shouldCache(url)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try cache first
      const cachedResponse = await cache.match(event.request);

      if (cachedResponse) {
        // Check if cache is expired
        const cachedAt = parseInt(cachedResponse.headers.get('x-cached-at') || '0', 10);
        const isExpired = cachedAt && (Date.now() - cachedAt > MAX_CACHE_AGE);

        if (!isExpired) {
          console.log('[ServiceWorker] Serving from cache:', url);

          // Refresh cache in background if older than 1 day
          const shouldRefresh = Date.now() - cachedAt > 24 * 60 * 60 * 1000;
          if (shouldRefresh) {
            console.log('[ServiceWorker] Refreshing cache in background:', url);
            fetch(event.request).then((response) => {
              if (isValidResponse(response)) {
                cache.put(event.request, response);
              }
            }).catch((error) => {
              console.warn('[ServiceWorker] Background refresh failed:', error);
            });
          }

          return cachedResponse;
        }

        console.log('[ServiceWorker] Cache expired, fetching fresh:', url);
      }

      // Fetch from network
      try {
        const networkResponse = await fetch(event.request);

        if (isValidResponse(networkResponse)) {
          // Clone response for caching
          const responseToCache = networkResponse.clone();

          // Add metadata headers
          const headers = new Headers(responseToCache.headers);
          headers.set('x-cached-at', Date.now().toString());
          headers.set('x-cache-version', CACHE_VERSION);

          const modifiedResponse = new Response(responseToCache.body, {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: headers
          });

          // Cache the response
          cache.put(event.request, modifiedResponse);
          console.log('[ServiceWorker] Cached from network:', url);
        }

        return networkResponse;
      } catch (error) {
        console.error('[ServiceWorker] Network fetch failed:', error);

        // Return cached response even if expired
        if (cachedResponse) {
          console.log('[ServiceWorker] Network failed, using stale cache:', url);
          return cachedResponse;
        }

        // Return error response
        return new Response('Network error occurred', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      }
    })
  );
});

/**
 * Message event - Handle cache management commands
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'CACHE_WASM':
      // Manually cache specific URLs
      event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
          const { wasmUrl, wasmJsUrl } = data;
          console.log('[ServiceWorker] Caching WASM files:', { wasmUrl, wasmJsUrl });

          try {
            await Promise.all([
              fetch(wasmUrl).then(res => cache.put(wasmUrl, res)),
              fetch(wasmJsUrl).then(res => cache.put(wasmJsUrl, res))
            ]);

            event.ports[0].postMessage({ success: true });
          } catch (error) {
            console.error('[ServiceWorker] Failed to cache:', error);
            event.ports[0].postMessage({ success: false, error: error.message });
          }
        })
      );
      break;

    case 'CLEAR_CACHE':
      // Clear all caches
      event.waitUntil(
        caches.delete(CACHE_NAME).then((deleted) => {
          console.log('[ServiceWorker] Cache cleared:', deleted);
          event.ports[0].postMessage({ success: deleted });
        })
      );
      break;

    case 'GET_CACHE_INFO':
      // Get cache information
      event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
          const keys = await cache.keys();
          const info = {
            version: CACHE_VERSION,
            size: keys.length,
            entries: keys.map(req => req.url)
          };
          event.ports[0].postMessage({ success: true, info });
        })
      );
      break;

    case 'SKIP_WAITING':
      // Force service worker to activate
      self.skipWaiting();
      break;

    default:
      console.warn('[ServiceWorker] Unknown message type:', type);
  }
});
