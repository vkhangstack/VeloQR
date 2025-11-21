# VeloQR

A high-performance React library for scanning QR codes using WebAssembly and Rust. Provides blazing-fast QR code detection with both live camera scanning and image file scanning capabilities.

## Features

- ⚡ **High Performance**: Powered by WebAssembly compiled from Rust for near-native speed
- 📷 **Live Camera Scanning**: Real-time QR code detection from webcam or device camera
- 🖼️ **Image File Scanning**: Scan QR codes from uploaded image files
- 🔍 **Multiple QR Detection**: Detect and decode multiple QR codes in a single frame
- 🎨 **Custom Styling**: Fully customizable UI with styling props and overlay options
- 📘 **TypeScript Support**: Full TypeScript definitions included
- 🪶 **Lightweight**: Optimized WASM binary for minimal bundle size

## Installation

```bash
npm install @vkhangstack/veloqr
```

## Quick Start

### Live Camera Scanning

```tsx
import React from 'react';
import { QRScanner, QRCodeResult } from '@vkhangstack/veloqr';

function App() {
  const handleScan = (results: QRCodeResult[]) => {
    console.log('QR Codes detected:', results);
    results.forEach((result) => {
      console.log('Data:', result.data);
    });
  };

  const handleError = (error: Error) => {
    console.error('Scanner error:', error);
  };

  return (
    <QRScanner
      onScan={handleScan}
      onError={handleError}
      scanDelay={500}
      videoConstraints={{
        facingMode: 'environment', // Use back camera
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }}
    />
  );
}

export default App;
```

### Image File Scanning

```tsx
import React from 'react';
import { QRImageScanner, QRCodeResult } from '@vkhangstack/veloqr';

function App() {
  const handleScan = (results: QRCodeResult[]) => {
    console.log('QR Codes detected:', results);
  };

  return (
    <QRImageScanner
      onScan={handleScan}
      acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
      showPreview={true}
    />
  );
}

export default App;
```

## Configuration

### WASM Loading

By default, VeloQR loads WASM files from CDN. You can customize this:

```tsx
import { configureWasm } from '@vkhangstack/veloqr';

// Load from CDN (default)
configureWasm('cdn');

// Load from specific version
configureWasm({ version: '1.0.2' });

// Load from custom URL
configureWasm({
  wasmUrl: '/path/to/veloqr_bg.wasm',
  wasmJsUrl: '/path/to/veloqr.js'
});
```

## API Reference

### QRScanner Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onScan` | `(results: QRCodeResult[]) => void` | - | Callback when QR codes are detected |
| `onError` | `(error: Error) => void` | - | Callback when an error occurs |
| `scanDelay` | `number` | `500` | Delay between scans in milliseconds |
| `videoConstraints` | `MediaTrackConstraints` | `{}` | Video constraints for camera |
| `className` | `string` | `''` | CSS class name |
| `showOverlay` | `boolean` | `true` | Show scanning overlay |

### QRImageScanner Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onScan` | `(results: QRCodeResult[]) => void` | - | Callback when QR codes are detected |
| `onError` | `(error: Error) => void` | - | Callback when an error occurs |
| `acceptedFormats` | `string[]` | `['image/*']` | Accepted image formats |
| `showPreview` | `boolean` | `true` | Show image preview |
| `className` | `string` | `''` | CSS class name |

### QRCodeResult

```typescript
interface QRCodeResult {
  data: string;        // Decoded QR code data
  version: number;     // QR code version
  bounds?: number[][]; // Bounding box coordinates
}
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Mobile browsers with camera access

## Performance Tips

1. **Adjust scan delay**: Increase `scanDelay` for better performance on low-end devices
2. **Use appropriate resolution**: Don't request 4K video if not needed
3. **Safari optimization**: The library automatically optimizes for Safari/iOS

## Links

- [GitHub Repository](https://github.com/vkhangstack/VeloQR)
- [Full Documentation](https://github.com/vkhangstack/VeloQR#readme)
- [Report Issues](https://github.com/vkhangstack/VeloQR/issues)

## License

MIT © [vkhangstack](https://github.com/vkhangstack)
