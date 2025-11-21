#!/bin/bash

# Verification script for React QR Scanner WASM
echo "==================================="
echo "React QR Scanner WASM - Setup Verification"
echo "==================================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  Node.js: $NODE_VERSION"
else
    echo "  ✗ Node.js not found"
    exit 1
fi

# Check Rust
echo "✓ Checking Rust..."
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    echo "  Rust: $RUST_VERSION"
else
    echo "  ✗ Rust not found"
    exit 1
fi

# Check wasm-pack
echo "✓ Checking wasm-pack..."
if command -v wasm-pack &> /dev/null; then
    WASM_PACK_VERSION=$(wasm-pack --version)
    echo "  wasm-pack: $WASM_PACK_VERSION"
else
    echo "  ✗ wasm-pack not found"
    exit 1
fi

# Check WASM build
echo ""
echo "✓ Checking WASM build..."
if [ -f "rust-qr/pkg/react_qr_scanner_wasm_bg.wasm" ]; then
    WASM_SIZE=$(du -h rust-qr/pkg/react_qr_scanner_wasm_bg.wasm | cut -f1)
    echo "  WASM binary found: $WASM_SIZE"
else
    echo "  ✗ WASM binary not found. Run: npm run build:wasm"
    exit 1
fi

# Check library build
echo "✓ Checking library build..."
if [ -f "dist/index.js" ] && [ -f "dist/index.esm.js" ]; then
    echo "  Library bundles found"
else
    echo "  ✗ Library bundles not found. Run: npm run build"
    exit 1
fi

# Check example setup
echo "✓ Checking example setup..."
if [ -f "example/public/rust-qr/pkg/react_qr_scanner_wasm_bg.wasm" ]; then
    echo "  Example WASM files found"
else
    echo "  ⚠ Example WASM files not found. Run: cd example && npm run setup"
fi

# Check dependencies
echo ""
echo "✓ Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "  Root dependencies installed"
else
    echo "  ✗ Root dependencies not found. Run: npm install"
    exit 1
fi

if [ -d "example/node_modules" ]; then
    echo "  Example dependencies installed"
else
    echo "  ⚠ Example dependencies not found. Run: cd example && npm install"
fi

echo ""
echo "==================================="
echo "✅ Setup verification complete!"
echo "==================================="
echo ""
echo "To run the example:"
echo "  cd example && npm run dev"
echo ""
echo "To test in your own project:"
echo "  npm install /path/to/react-qr-scanner-wasm"
echo ""
