# VeloQR

A high-performance React library for scanning QR codes using WebAssembly and Rust. This library provides blazing-fast QR code detection with both live camera scanning and image file scanning capabilities.

## Features

- **High Performance**: Powered by WebAssembly compiled from Rust for near-native speed
- **QR Code Scanning**: Real-time QR code detection from webcam or device camera
- **Live Camera Scanning**: Real-time detection from webcam or device camera
- **Image File Scanning**: Scan QR codes and MRZ from uploaded image files
- **Multiple QR Detection**: Detect and decode multiple QR codes in a single frame
- **Animated Feedback**: Beautiful scanning and detection animations
- **Custom Styling**: Fully customizable UI with styling props and overlay options
- **TypeScript Support**: Full TypeScript definitions included
- **Lightweight**: Optimized WASM binary for minimal bundle size
- **MRZ Reading**: EXPECTED! Passport and ID card MRZ (Machine Readable Zone) scanning support
  - TD1 (ID cards), TD2 (travel documents), and TD3 (passports)
  - Automatic document type detection
  - Full data extraction (name, DOB, nationality, document number, etc.)

## Prerequisites

Before building the library, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **Rust** (latest stable version)
- **wasm-pack**: Install via `cargo install wasm-pack`

## Installation

### For Users

```bash
npm i @vkhangstack/veloqr
```

### For Development

```bash
# Clone the repository
git clone https://github.com/vkhangstack/VeloQR.git
cd VeloQR

# Install dependencies
npm install

# Build the WASM module
npm run build:wasm

# Build the library
npm run build
```

## Building from Source

### 1. Build the Rust WASM Module

```bash
cd rust-qr
wasm-pack build --target web --out-dir pkg
cd ..
```

Or use the npm script:

```bash
npm run build:wasm
```

### 2. Build the React Library

```bash
npm run build:rollup
```

Or build everything at once:

```bash
npm run build
```

## Usage

### Live Camera Scanning

```tsx
import React from 'react';
import { QRScanner, QRCodeResult } from '@vkhangstack/veloqr';

function App() {
  const handleScan = (results: QRCodeResult[]) => {
    console.log('QR Codes detected:', results);
    results.forEach((result) => {
      console.log('Data:', result.data);
      console.log('Version:', result.version);
    });
  };

  const handleError = (error: Error) => {
    console.error('Scanner error:', error);
  };

  return (
    <QRScanner
      onScan={handleScan}
      onError={handleError}
      scanDelay={300}
      showOverlay={true}
      highlightColor="#00ff00"
      highlightBorderWidth={3}
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
    console.log('QR Codes found in image:', results);
  };

  const handleError = (error: Error) => {
    console.error('Scanner error:', error);
  };

  return (
    <QRImageScanner
      onScan={handleScan}
      onError={handleError}
      showPreview={true}
      acceptedFormats={['image/png', 'image/jpeg', 'image/jpg']}
    />
  );
}

export default App;
```

### MRZ (Machine Readable Zone) Scanning

VeloQR now includes powerful MRZ scanning capabilities for passports and ID cards!

#### Live MRZ Camera Scanning

```tsx
import React from 'react';
import { MRZScanner, MRZResult } from '@vkhangstack/veloqr';

function App() {
  const handleScan = (result: MRZResult) => {
    console.log('MRZ detected:', result);
    console.log('Document Type:', result.documentType); // TD1, TD2, or TD3
    console.log('Document Number:', result.documentNumber);
    console.log('Name:', result.surname, result.givenNames);
    console.log('Date of Birth:', result.dateOfBirth);
    console.log('Nationality:', result.nationality);
  };

  const handleError = (error: Error) => {
    console.error('MRZ Scanner error:', error);
  };

  return (
    <MRZScanner
      onScan={handleScan}
      onError={handleError}
      scanDelay={500}
      showOverlay={true}
      highlightColor="#00ff00"
      showCameraSwitch={true}
    />
  );
}

export default App;
```

#### MRZ Image File Scanning

```tsx
import React from 'react';
import { MRZImageScanner, MRZResult } from '@vkhangstack/veloqr';

function App() {
  const handleScan = (result: MRZResult) => {
    console.log('MRZ found in image:', result);
    // Process the MRZ data
  };

  const handleError = (error: Error) => {
    console.error('Scanner error:', error);
  };

  return (
    <MRZImageScanner
      onScan={handleScan}
      onError={handleError}
      showPreview={true}
      acceptedFormats={['image/png', 'image/jpeg', 'image/jpg']}
    />
  );
}

export default App;
```

#### MRZ Result Structure

```typescript
interface MRZResult {
  documentType: string;      // TD1, TD2, or TD3
  documentNumber: string;     // Passport/ID number
  dateOfBirth: string;        // YYMMDD format
  dateOfExpiry: string;       // YYMMDD format
  nationality: string;        // 3-letter country code
  sex: string;               // M, F, or X
  surname: string;           // Last name(s)
  givenNames: string;        // First and middle names
  optionalData: string;      // Additional data (if any)
  issuingCountry: string;    // 3-letter country code
  rawMrz: string[];         // Raw MRZ lines
  confidence: number;        // Recognition confidence (0-1)
  bounds?: {                // Bounding box (if detected)
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

#### Supported Document Types

- **TD1**: ID cards (3 lines of 30 characters)
- **TD2**: Official travel documents (2 lines of 36 characters)
- **TD3**: Passports (2 lines of 44 characters)

#### MRZ Utility Functions

```tsx
import { formatMRZDate, validateMRZ, validateCheckDigit } from '@vkhangstack/veloqr';

// Format MRZ date (YYMMDD) to readable format (YYYY-MM-DD)
const formattedDate = formatMRZDate('900815'); // Returns: "1990-08-15"

// Validate MRZ result
const validation = validateMRZ(mrzResult);
console.log('Is valid:', validation.isValid);
console.log('Errors:', validation.errors);

// Validate check digit
const isValid = validateCheckDigit('AB2134<<<', '5');
```

#### Using the MRZ Hook

For advanced use cases, you can use the `useMRZScanner` hook directly:

```tsx
import React, { useEffect } from 'react';
import { useMRZScanner } from '@vkhangstack/veloqr';

function CustomMRZScanner() {
  const {
    videoRef,
    canvasRef,
    isScanning,
    startScanning,
    stopScanning,
    lastResult,
    error,
  } = useMRZScanner({
    scanDelay: 500,
    onScan: (result) => console.log('MRZ:', result),
    onError: (err) => console.error('Error:', err),
  });

  useEffect(() => {
    startScanning();
    return () => stopScanning();
  }, []);

  return (
    <div>
      <video ref={videoRef} />
      <canvas ref={canvasRef} />
      {lastResult && (
        <div>
          <p>Name: {lastResult.surname}, {lastResult.givenNames}</p>
          <p>Document: {lastResult.documentNumber}</p>
        </div>
      )}
    </div>
  );
}
```

### Custom Text and Internationalization

You can customize all text displayed by the scanner, including the detected count message:

```tsx
import React from 'react';
import { QRScanner, QRCodeResult } from 'veloqr';

function App() {
  return (
    <QRScanner
      onScan={(results) => console.log(results)}
      animationText={{
        scanning: 'Scanning for QR codes...',
        detected: 'Found QR code!',
        detectedCount: 'Found {count} QR code{plural}', // {count} and {plural} are placeholders
      }}
    />
  );
}
```

**Available placeholders:**
- `{count}` - The number of QR codes detected
- `{plural}` - Automatically replaced with 's' if count > 1, empty string otherwise

**Pre-configured languages:**

```tsx
import { QRScanner, getTextsByLanguage } from 'veloqr';

// Use Vietnamese text (default)
<QRScanner animationText={getTextsByLanguage('vi')} />

// Use English text
<QRScanner animationText={getTextsByLanguage('en')} />

// Use Spanish text
<QRScanner animationText={getTextsByLanguage('es')} />

// Other supported languages: 'zh' (Chinese), 'ja' (Japanese), 'fr' (French)
```

**Custom text for specific languages:**

```tsx
// Spanish example
<QRScanner
  animationText={{
    scanning: 'Escaneando código QR...',
    detected: '¡Código QR detectado!',
    detectedCount: 'Detectado{plural} {count} código{plural} QR',
  }}
/>

// German example
<QRScanner
  animationText={{
    scanning: 'QR-Code wird gescannt...',
    detected: 'QR-Code erkannt!',
    detectedCount: '{count} QR-Code{plural} erkannt',
  }}
/>
```

### Using the Hook

For more control, you can use the `useQRScanner` hook:

```tsx
import React, { useEffect } from 'react';
import { useQRScanner, QRCodeResult } from 'veloqr';

function CustomScanner() {
  const { videoRef, canvasRef, isScanning, startScanning, stopScanning, lastResults, error } =
    useQRScanner({
      scanDelay: 300,
      onScan: (results: QRCodeResult[]) => {
        console.log('Scanned:', results);
      },
      onError: (err: Error) => {
        console.error('Error:', err);
      },
    });

  useEffect(() => {
    startScanning();
    return () => stopScanning();
  }, []);

  return (
    <div>
      <video ref={videoRef} style={{ width: '100%' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div>Status: {isScanning ? 'Scanning...' : 'Stopped'}</div>
      {lastResults.length > 0 && (
        <div>
          {lastResults.map((result, i) => (
            <p key={i}>{result.data}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomScanner;
```
### Camera Switching

```tsx
import { QRScanner } from 'veloqr';
import { useState } from 'react';

function App() {
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');

  return (
    <div>
      <QRScanner
        prefer redCamera={cameraFacing}
        showCameraSwitch={true} // Shows built-in switch button
      />
      <button onClick={() => setCameraFacing(prev => prev === 'front' ? 'back' : 'front')}>
        Switch Camera
      </button>
    </div>
  );
}
```

### Advanced: Using the Hook with Camera Management

```tsx
import { useQRScanner, getCameraDevices } from 'veloqr';
import { useEffect, useState } from 'react';

function CustomScanner() {
  const [cameras, setCameras] = useState([]);

  const {
    videoRef,
    canvasRef,
    isScanning,
    startScanning,
    switchCamera,
    availableCameras,
    currentCamera,
  } = useQRScanner({
    enableFrameMerging: true,
    optimizeForSafari: true, // Auto-detected
    onScan: (results) => console.log(results),
  });

  useEffect(() => {
    startScanning();
  }, []);

  return (
    <div>
      <video ref={videoRef} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <select onChange={(e) => switchCamera(e.target.value as any)}>
        {availableCameras.map(cam => (
          <option key={cam.deviceId} value={cam.deviceId}>
            {cam.label}
          </option>
        ))}
      </select>

      <p>Current: {currentCamera?.label}</p>
    </div>
  );
}
```

### Frame Merging for Better Accuracy

```tsx
import { QRScanner } from 'veloqr';

function App() {
  return (
    <QRScanner
      enableFrameMerging={true} // Enable temporal averaging
      frameMergeCount={5} // Average last 5 frames (default: 3)
      onScan={(results) => console.log(results)}
    />
  );
}
```

### Use Back Camera (Default)

```tsx
import { QRScanner } from 'veloqr';

function App() {
  return (
    <QRScanner
      preferredCamera="back"  // or "environment"
      onScan={(results) => console.log(results)}
    />
  );
}
```

### Use Front Camera

```tsx
import { QRScanner } from 'veloqr';

function App() {
  return (
    <QRScanner
      preferredCamera="front"  // or "user"
      onScan={(results) => console.log(results)}
    />
  );
}
```

### Enable Camera Switching

Add a built-in camera switch button:

```tsx
import { QRScanner } from 'veloqr';

function App() {
  return (
    <QRScanner
      preferredCamera="back"
      showCameraSwitch={true}  // Shows 🔄 button
      onScan={(results) => console.log(results)}
    />
  );
}
```

## Advanced Configuration

### WASM Module Configuration

By default, VeloQR attempts to load the WASM module automatically using multiple strategies. However, in some cases, you may need to specify a custom URL for the WASM file, especially when:

- Deploying to CDN
- Using a custom build/bundler configuration
- Serving WASM files from a different path

#### Configuring Custom WASM URL

```tsx
import { configureWasm } from 'veloqr';

// Configure before using any QR scanner components
configureWasm({
  wasmUrl: '/rust-qr/pkg/veloqr_bg.wasm'
});

// Or load from a CDN
configureWasm({
  wasmUrl: 'https://cdn.example.com/wasm/veloqr_bg.wasm',
  wasmJsUrl: 'https://cdn.example.com/wasm/veloqr.js' // optional
});
```

#### Setting Up WASM Files in Your Project

**For Vite projects:**

1. Copy WASM files to your public directory:
```bash
mkdir -p public/rust-qr/pkg
cp -r node_modules/veloqr/rust-qr/pkg/* public/rust-qr/pkg/
```

2. Configure the WASM loader in your app entry point:
```tsx
import { configureWasm } from 'veloqr';

configureWasm({
  wasmUrl: '/rust-qr/pkg/veloqr_bg.wasm'
});
```

3. Ensure your `vite.config.ts` includes WASM support:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm'],
});
```

**For Next.js projects:**

1. Add WASM files to your `public` folder
2. Configure in `_app.tsx` or component:
```tsx
import { configureWasm } from 'veloqr';

configureWasm({
  wasmUrl: '/rust-qr/pkg/veloqr_bg.wasm'
});
```

3. Add to `next.config.js`:
```javascript
module.exports = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};
```

**For Create React App:**

1. Copy WASM files to `public` folder
2. Configure in your `index.tsx`:
```tsx
import { configureWasm } from 'veloqr';

configureWasm({
  wasmUrl: '/rust-qr/pkg/veloqr_bg.wasm'
});
```

### `configureWasm(config)`

Configure the WASM loader with custom URLs.

**Parameters:**

| Parameter          | Type                | Description                                |
| ------------------ | ------------------- | ------------------------------------------ |
| `config.wasmUrl`   | `string`            | Full URL or path to the `.wasm` file       |
| `config.wasmJsUrl` | `string` (optional) | Full URL or path to the `.js` wrapper file |

**Example:**

```tsx
import { configureWasm } from 'veloqr';

// Basic usage - just specify the WASM file
configureWasm({
  wasmUrl: '/static/wasm/veloqr_bg.wasm'
});

// Advanced - specify both WASM and JS files
configureWasm({
  wasmUrl: 'https://cdn.myapp.com/veloqr_bg.wasm',
  wasmJsUrl: 'https://cdn.myapp.com/veloqr.js'
});
```

### `resetWasm()`

Reset the WASM configuration and instance. Useful for testing or reconfiguration.

```tsx
import { resetWasm } from 'veloqr';

resetWasm();
```

## API Reference

### `<QRScanner />`

Props:

| Prop                   | Type                                | Default                | Description                              |
| ---------------------- | ----------------------------------- | ---------------------- | ---------------------------------------- |
| `onScan`               | `(results: QRCodeResult[]) => void` | -                      | Callback when QR codes are detected      |
| `onError`              | `(error: Error) => void`            | -                      | Callback when an error occurs            |
| `scanDelay`            | `number`                            | `300`                  | Delay between scans in milliseconds      |
| `videoConstraints`     | `MediaTrackConstraints`             | -                      | Constraints for video stream             |
| `className`            | `string`                            | `''`                   | CSS class name                           |
| `style`                | `React.CSSProperties`               | `{}`                   | Inline styles                            |
| `showOverlay`          | `boolean`                           | `true`                 | Show overlay on video                    |
| `overlayColor`         | `string`                            | `'rgba(0, 0, 0, 0.5)'` | Overlay background color                 |
| `overlayOpacity`       | `number`                            | `0.5`                  | Overlay opacity                          |
| `highlightColor`       | `string`                            | `'#00ff00'`            | Color for highlighting detected QR codes |
| `highlightBorderWidth` | `number`                            | `3`                    | Width of highlight border                |
| `animationText`        | `AnimationText`                     | `{}`                   | Custom text for animations (see below)   |
| `animationConfig`      | `AnimationConfig`                   | `{}`                   | Animation configuration (see below)      |

### `<QRImageScanner />`

Props:

| Prop              | Type                                | Default                                                  | Description                            |
| ----------------- | ----------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| `onScan`          | `(results: QRCodeResult[]) => void` | -                                                        | Callback when QR codes are detected    |
| `onError`         | `(error: Error) => void`            | -                                                        | Callback when an error occurs          |
| `className`       | `string`                            | `''`                                                     | CSS class name                         |
| `style`           | `React.CSSProperties`               | `{}`                                                     | Inline styles                          |
| `showPreview`     | `boolean`                           | `true`                                                   | Show image preview                     |
| `acceptedFormats` | `string[]`                          | `['image/png', 'image/jpeg', 'image/jpg', 'image/webp']` | Accepted image formats                 |
| `animationText`   | `AnimationText`                     | `{}`                                                     | Custom text for animations (see below) |
| `animationConfig` | `AnimationConfig`                   | `{}`                                                     | Animation configuration (see below)    |

### `AnimationText`

```typescript
interface AnimationText {
  scanning?: string;        // Text shown while scanning (e.g., "Scanning QR Code...")
  detected?: string;        // Text shown when QR detected (e.g., "QR Code Detected!")
  processing?: string;      // Text shown while processing (e.g., "Processing...")
  success?: string;         // Text shown on success (e.g., "Found {count} QR Code(s)!")
  detectedCount?: string;   // Text for count display (e.g., "Detected {count} QR code{plural}")
}
```

**Placeholders:**
- `{count}` - Number of QR codes detected
- `{plural}` - Replaced with 's' if count > 1, empty otherwise

### `AnimationConfig`

```typescript
interface AnimationConfig {
  showScanningLine?: boolean;    // Show animated scan line
  showCorners?: boolean;         // Show corner markers
  showStatusText?: boolean;      // Show status text
  animationColor?: string;       // Color for animations
  scanLineSpeed?: number;        // Speed of scan line (default: 2)
  detectionDuration?: number;    // Duration to show detection (ms, default: 1000)
}
```

### `useQRScanner(options)`

Options:

| Option      | Type                                | Default | Description                         |
| ----------- | ----------------------------------- | ------- | ----------------------------------- |
| `scanDelay` | `number`                            | `300`   | Delay between scans in milliseconds |
| `onScan`    | `(results: QRCodeResult[]) => void` | -       | Callback when QR codes are detected |
| `onError`   | `(error: Error) => void`            | -       | Callback when an error occurs       |

Returns:

| Property        | Type                                 | Description                |
| --------------- | ------------------------------------ | -------------------------- |
| `videoRef`      | `React.RefObject<HTMLVideoElement>`  | Ref for video element      |
| `canvasRef`     | `React.RefObject<HTMLCanvasElement>` | Ref for canvas element     |
| `isScanning`    | `boolean`                            | Whether scanning is active |
| `startScanning` | `() => Promise<void>`                | Start scanning             |
| `stopScanning`  | `() => void`                         | Stop scanning              |
| `lastResults`   | `QRCodeResult[]`                     | Last detected QR codes     |
| `error`         | `Error \| null`                      | Last error, if any         |

### `QRCodeResult`

```typescript
interface QRCodeResult {
  data: string;           // Decoded QR code data
  version: number;        // QR code version
  bounds: [number, number][]; // Corner points of the QR code
}
```

## Running the Example

```bash
# Build the library first
npm run build

# Navigate to example directory
cd example

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open your browser to `http://localhost:3000` to see the demo application.

## Browser Compatibility

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 15+
- Mobile browsers with camera support

**Note**: HTTPS is required for camera access in production environments.

## Performance

The WASM module is optimized for:
- Fast initialization
- Minimal memory footprint
- Real-time processing at 30+ FPS
- Multiple QR code detection in a single frame

## License

License. See `LICENSE` file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Troubleshooting

### Camera Permission Denied

Ensure your application is served over HTTPS (or localhost for development) and that the user has granted camera permissions.

### WASM Module Failed to Load

**Error: "expected magic word 00 61 73 6d, found 3c 21 44 4f"**

This error means the WASM file is being served as HTML (usually a 404 page). Solutions:

1. Ensure WASM files are in your public directory:
```bash
mkdir -p public/rust-qr/pkg
cp -r node_modules/veloqr/rust-qr/pkg/* public/rust-qr/pkg/
```

2. Configure the WASM URL explicitly:
```tsx
import { configureWasm } from 'veloqr';

configureWasm({
  wasmUrl: '/rust-qr/pkg/veloqr_bg.wasm'
});
```

3. Check your server configuration serves `.wasm` files with the correct MIME type (`application/wasm`)

**For Nginx:**
```nginx
types {
    application/wasm wasm;
}
```

**For Apache (.htaccess):**
```apache
AddType application/wasm .wasm
```

**WASM Module Build Errors**

Make sure to build the WASM module using `npm run build:wasm` before building the library.

### Build Errors

Ensure you have the latest versions of:
- Node.js
- Rust
- wasm-pack

## Publishing to npm (For Maintainers)

### Quick Publish

```bash
# Patch release (1.0.0 → 1.0.1) - Bug fixes
npm run release:patch

# Minor release (1.0.0 → 1.1.0) - New features
npm run release:minor

# Major release (1.0.0 → 2.0.0) - Breaking changes
npm run release:major
```

### Detailed Publishing Process

1. **Run pre-publish checks:**
   ```bash
   npm run publish:check
   ```

2. **Build everything:**
   ```bash
   npm run build
   ```

3. **Test locally:**
   ```bash
   cd example && npm run dev
   ```

4. **Bump version and publish:**
   ```bash
   npm run release:patch  # or minor/major
   ```

5. **Push to Git:**
   ```bash
   git push && git push --tags
   ```
## Credits

Built with:
- [rqrr](https://github.com/WanzenBug/rqrr) - Rust QR code detection library
- [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen) - Rust/WebAssembly interop
- React - UI framework

## Donations
If you find this library useful, consider supporting its development:
- Buy me a coffee: [https://www.buymeacoffee.com/vkhangstack](https://www.buymeacoffee.com/vkhangstack)
