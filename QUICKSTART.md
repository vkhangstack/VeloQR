# Quick Start Guide

This guide will help you get started with the VeloQR library quickly.

## Installation

```bash
npm install
npm run build
```

## Running the Example

The fastest way to see the library in action:

```bash
# 1. Build the library (if not already done)
npm run build

# 2. Navigate to the example directory
cd example

# 3. Install example dependencies
npm install

# 4. Setup WASM files and start dev server
npm run dev
```

**Note**: The `npm run dev` command automatically copies WASM files to the public directory.

Open your browser to `http://localhost:3000` and you'll see two tabs:
- **Camera Scanner**: Real-time QR code scanning from your webcam
- **Image Scanner**: Upload and scan QR codes from image files

### If you get WASM loading errors:

**Error: "expected magic word 00 61 73 6d, found 3c 21 44 4f"**

This means the WASM file is being served as HTML (404 error). Fix it by:

```bash
# 1. Manually copy WASM files
cd example
npm run setup

# 2. Then start the dev server
npm run dev
```

Or configure WASM URL in your code (see below).

## Basic Usage in Your Project

### 1. Install the library

After building, you can use it in your React project:

```bash
npm i @vkhangstack/veloqr
```

Or for local development:

```bash
npm install /path/to/veloqr
```

### 2. Configure WASM Loading (Important!)

In your application entry point (e.g., `src/main.tsx` or `src/index.tsx`):

```tsx
import { configureWasm } from 'veloqr';

// Copy WASM files to public directory first:
// mkdir -p public/rust-qr/pkg
// cp -r node_modules/veloqr/rust-qr/pkg/* public/rust-qr/pkg/

// Then configure the WASM URL
configureWasm({
  wasmUrl: '/rust-qr/pkg/veloqr_bg.wasm'
});
```

**For Vite projects**, ensure `vite.config.ts` includes:
```typescript
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm'], // Important!
});
```

### 3. Use the Camera Scanner

```tsx
import { QRScanner } from 'veloqr';

function App() {
  return (
    <QRScanner
      onScan={(results) => {
        results.forEach(qr => console.log('QR Data:', qr.data));
      }}
      onError={(error) => console.error(error)}
    />
  );
}
```

### 3. Use the Image Scanner

```tsx
import { QRImageScanner } from 'veloqr';

function App() {
  return (
    <QRImageScanner
      onScan={(results) => {
        results.forEach(qr => console.log('QR Data:', qr.data));
      }}
      onError={(error) => console.error(error)}
    />
  );
}
```

## Project Structure

```
veloqr/
├── rust-qr/              # Rust/WASM QR detection module
│   ├── src/lib.rs        # Main Rust code
│   ├── Cargo.toml        # Rust dependencies
│   └── pkg/              # Built WASM files (after build)
├── src/                  # React library source
│   ├── QRScanner.tsx     # Camera scanner component
│   ├── QRImageScanner.tsx # Image file scanner
│   ├── hooks/            # React hooks
│   ├── utils/            # Utilities
│   └── types.ts          # TypeScript definitions
├── dist/                 # Built library (after build)
├── example/              # Demo application
└── package.json
```

## Development Commands

```bash
# Build only the WASM module
npm run build:wasm

# Build only the React library
npm run build:rollup

# Build everything
npm run build

# Watch mode (rebuilds on changes)
npm run dev
```

## Features Included

✅ Live camera QR scanning with real-time detection
✅ Image file upload and scanning
✅ Multiple QR code detection in a single frame
✅ Customizable styling and overlays
✅ TypeScript support with full type definitions
✅ WebAssembly-powered for high performance
✅ Written in Rust for safety and speed

## Browser Requirements

- Modern browser with WebAssembly support
- HTTPS (or localhost) for camera access
- Camera permissions granted by user

## Common Issues

### WASM Module Failed to Load

**Error: "expected magic word 00 61 73 6d, found 3c 21 44 4f"**

This means the WASM file is returning HTML (404 error). Solutions:

1. **Copy WASM files to public directory:**
   ```bash
   mkdir -p public/rust-qr/pkg
   cp -r node_modules/veloqr/rust-qr/pkg/* public/rust-qr/pkg/
   ```

2. **Configure WASM URL:**
   ```tsx
   import { configureWasm } from 'veloqr';

   configureWasm({
     wasmUrl: '/rust-qr/pkg/veloqr_bg.wasm'
   });
   ```

3. **Check MIME type** - Ensure your server serves `.wasm` files with `application/wasm` content type

### Camera not working
- Ensure you're using HTTPS (or localhost for dev)
- Check browser camera permissions
- Try a different browser if issues persist

### Build errors
- Ensure Rust and wasm-pack are installed:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  cargo install wasm-pack
  ```

## Next Steps

- Read the full [README.md](./README.md) for detailed API documentation
- Check out the [example/src/App.tsx](./example/src/App.tsx) for advanced usage
- Customize the styling to match your application

## Need Help?

If you encounter any issues, check:
1. Node.js version (v16+)
2. Rust installation (`rustc --version`)
3. wasm-pack installation (`wasm-pack --version`)
4. Browser console for error messages
