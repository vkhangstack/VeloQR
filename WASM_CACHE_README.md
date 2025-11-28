# WASM Cache - Quick Start Guide

## 📦 Giới thiệu

VeloQR hỗ trợ **tự động cache WASM files** để:
- ⚡ Load nhanh hơn (lần 2+)
- 🔌 Hoạt động offline
- 📉 Giảm bandwidth

**Cache được bật mặc định** - không cần config gì thêm!

## 🚀 Sử dụng cơ bản

### 1. Automatic Caching (Mặc định)

```tsx
import { QRScanner } from '@vkhangstack/veloqr';

function App() {
  return (
    <QRScanner onScan={(result) => console.log(result)} />
  );
}
```

✅ Lần đầu: Load từ CDN → Tự động cache
✅ Lần sau: Load từ cache (siêu nhanh!)

### 2. Preload Cache (Khuyên dùng)

Preload WASM files ngay khi app khởi động:

```tsx
import { useEffect } from 'react';
import { preloadWasmCache, configureWasm } from '@vkhangstack/veloqr';

function App() {
  useEffect(() => {
    // Configure WASM source
    configureWasm('cdn');

    // Preload into cache
    preloadWasmCache(
      'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr_bg.wasm',
      'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr.js'
    ).then(() => console.log('✅ WASM cached!'));
  }, []);

  return <QRScanner onScan={...} />;
}
```

### 3. Với Loading State

```tsx
import { useState, useEffect } from 'react';
import { preloadWasmCache } from '@vkhangstack/veloqr';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    preloadWasmCache(
      'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr_bg.wasm',
      'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr.js'
    ).then(() => setReady(true));
  }, []);

  if (!ready) return <div>Loading...</div>;

  return <QRScanner onScan={...} />;
}
```

## 🛠️ Cache Management API

### Check cache status

```tsx
import { isWasmCached, getWasmCacheInfo } from '@vkhangstack/veloqr';

// Check if cached
const cached = await isWasmCached(wasmUrl, wasmJsUrl);
console.log('Cached:', cached);

// Get cache info
const info = await getWasmCacheInfo();
console.log('Cache info:', info);
// {
//   supported: true,
//   exists: true,
//   size: 2,
//   entries: ['url1', 'url2']
// }
```

### Clear cache

```tsx
import { clearWasmCache } from '@vkhangstack/veloqr';

const cleared = await clearWasmCache();
if (cleared) {
  console.log('✅ Cache cleared');
}
```

### Update cache (Force refresh)

```tsx
import { updateWasmCache } from '@vkhangstack/veloqr';

await updateWasmCache(
  'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@latest/bundle/bin/complete/veloqr_bg.wasm',
  'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@latest/bundle/bin/complete/veloqr.js'
);
console.log('✅ Cache updated');
```

### Disable cache (Nếu cần)

```tsx
import { configureCaching } from '@vkhangstack/veloqr';

// Tắt cache
configureCaching(false);

// Bật lại
configureCaching(true);
```

## 🎯 Use Cases

### Use Case 1: PWA với Offline Support

```tsx
import { useEffect } from 'react';
import { configureWasm, preloadWasmCache } from '@vkhangstack/veloqr';

function App() {
  useEffect(() => {
    // Setup offline support
    const setupOffline = async () => {
      configureWasm('cdn');
      await preloadWasmCache(
        'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr_bg.wasm',
        'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr.js'
      );
      console.log('✅ App works offline now!');
    };
    setupOffline();
  }, []);

  return <QRScanner />;
}
```

### Use Case 2: Cache Management UI

```tsx
import { useState } from 'react';
import { getWasmCacheInfo, clearWasmCache } from '@vkhangstack/veloqr';

function CachePanel() {
  const [info, setInfo] = useState(null);

  const refresh = async () => {
    const cacheInfo = await getWasmCacheInfo();
    setInfo(cacheInfo);
  };

  const clear = async () => {
    await clearWasmCache();
    refresh();
  };

  return (
    <div>
      <button onClick={refresh}>Check Cache</button>
      <button onClick={clear}>Clear Cache</button>
      {info && (
        <div>
          <p>Cached: {info.exists ? 'Yes ✅' : 'No ❌'}</p>
          <p>Files: {info.size}</p>
        </div>
      )}
    </div>
  );
}
```

### Use Case 3: Load from Local Files

```tsx
import { useEffect } from 'react';
import { configureWasm, preloadWasmCache } from '@vkhangstack/veloqr';

function App() {
  useEffect(() => {
    // Configure to load from public folder
    configureWasm({
      wasmUrl: '/wasm/veloqr_bg.wasm',
      wasmJsUrl: '/wasm/veloqr.js'
    });

    // Preload local files
    preloadWasmCache('/wasm/veloqr_bg.wasm', '/wasm/veloqr.js');
  }, []);

  return <QRScanner />;
}
```

## 🔧 Advanced: Service Worker

Để có offline support tốt hơn, sử dụng Service Worker:

### Bước 1: Copy service worker file

```bash
cp node_modules/@vkhangstack/veloqr/release/service-worker.js public/
```

### Bước 2: Register trong app

```tsx
import { useEffect } from 'react';
import { registerServiceWorker } from '@vkhangstack/veloqr';

function App() {
  useEffect(() => {
    registerServiceWorker('/service-worker.js').then((registered) => {
      if (registered) {
        console.log('✅ Service Worker active');
      }
    });
  }, []);

  return <QRScanner />;
}
```

### Check Service Worker status

```tsx
import { getServiceWorkerStatus } from '@vkhangstack/veloqr';

const status = getServiceWorkerStatus();
console.log('Supported:', status.supported);
console.log('Registered:', status.registered);
console.log('Active:', status.active);
```

## 📋 API Reference

| Function                               | Description             |
| -------------------------------------- | ----------------------- |
| `preloadWasmCache(wasmUrl, wasmJsUrl)` | Preload WASM vào cache  |
| `isWasmCached(wasmUrl, wasmJsUrl)`     | Check nếu đã cache      |
| `clearWasmCache()`                     | Xóa cache               |
| `getWasmCacheInfo()`                   | Lấy thông tin cache     |
| `updateWasmCache(wasmUrl, wasmJsUrl)`  | Force update cache      |
| `configureCaching(enabled)`            | Bật/tắt cache           |
| `registerServiceWorker(scriptUrl)`     | Register service worker |
| `getServiceWorkerStatus()`             | Lấy SW status           |

## ⚙️ Configuration

### Cache Options

```tsx
import { initializeCache } from '@vkhangstack/veloqr';

initializeCache({
  version: 'v1',           // Cache version
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days (default)
});
```

### Disable cache trong development

```tsx
import { configureCaching } from '@vkhangstack/veloqr';

if (process.env.NODE_ENV === 'development') {
  configureCaching(false);
}
```

## 🌐 Browser Support

Cache API yêu cầu:
- ✅ **HTTPS** (secure context)
- ✅ Modern browsers:
  - Chrome 40+
  - Firefox 41+
  - Safari 11.1+
  - Edge 17+

## ❓ Troubleshooting

### Cache không hoạt động?

```tsx
// Check if supported
import { getWasmCacheInfo } from '@vkhangstack/veloqr';

const info = await getWasmCacheInfo();
if (!info.supported) {
  console.error('Cache API not supported');
  console.log('Make sure you are using HTTPS');
}
```

### CORS errors?

- Sử dụng jsDelivr CDN (mặc định)
- Hoặc host WASM files trên cùng domain

## 💡 Best Practices

1. ✅ **Preload sớm** - Gọi `preloadWasmCache()` ngay khi app start
2. ✅ **Check cache** - Sử dụng `isWasmCached()` trước khi preload
3. ✅ **Error handling** - Luôn có fallback nếu cache fails
4. ✅ **Version management** - Clear cache khi update major version
5. ✅ **Use Service Worker** - Cho offline support tốt nhất

## 📝 Example: Complete Setup

```tsx
import { useEffect, useState } from 'react';
import {
  configureWasm,
  preloadWasmCache,
  isWasmCached,
  registerServiceWorker,
  QRScanner
} from '@vkhangstack/veloqr';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Configure WASM
        configureWasm('cdn');

        // 2. Register Service Worker
        await registerServiceWorker('/service-worker.js');

        // 3. Check if cached
        const wasmUrl = 'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr_bg.wasm';
        const wasmJsUrl = 'https://cdn.jsdelivr.net/npm/@vkhangstack/veloqr@1.2.2/bundle/bin/complete/veloqr.js';

        const cached = await isWasmCached(wasmUrl, wasmJsUrl);

        if (!cached) {
          console.log('Preloading WASM...');
          await preloadWasmCache(wasmUrl, wasmJsUrl);
        }

        console.log('✅ App ready with offline support!');
        setReady(true);
      } catch (error) {
        console.error('Init failed:', error);
        setReady(true); // Continue anyway
      }
    };

    init();
  }, []);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <QRScanner
      onScan={(result) => console.log(result)}
      onError={(error) => console.error(error)}
    />
  );
}

export default App;
```

## 🎉 Kết luận

Với WASM caching:
- ✅ App load nhanh hơn nhiều
- ✅ Hoạt động offline
- ✅ Tiết kiệm bandwidth
- ✅ UX tốt hơn

Chỉ cần 3 dòng code:

```tsx
configureWasm('cdn');
await preloadWasmCache(wasmUrl, wasmJsUrl);
// Done! ✅
```


