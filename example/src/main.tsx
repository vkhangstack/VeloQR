import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { configureWasm, configureWorker } from '@vkhangstack/veloqr';

// Configure WASM to load from public directory
// This ensures the WASM file is found at the correct path
configureWasm({
  wasmUrl: '/rust-qr/pkg/veloqr_bg.wasm',
  wasmJsUrl: '/rust-qr/pkg/veloqr.js'
});
configureWorker(true, { workerUrl: '/rust-qr/pkg/worker.js' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
