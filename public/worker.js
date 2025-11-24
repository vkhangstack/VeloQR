// QR Code Processing Web Worker
// This runs in a separate thread to keep the main UI responsive

let wasmModule = null;
let isInitialized = false;

// Load and initialize WASM module
async function initializeWasm(wasmUrl, wasmJsUrl) {
  if (isInitialized && wasmModule) {
    return { success: true };
  }

  try {
    // Fetch WASM binary
    const wasmResponse = await fetch(wasmUrl);
    if (!wasmResponse.ok) {
      throw new Error(`Failed to load WASM: ${wasmResponse.status}`);
    }
    const wasmBytes = await wasmResponse.arrayBuffer();

    // Fetch JS wrapper
    const jsResponse = await fetch(wasmJsUrl);
    if (!jsResponse.ok) {
      throw new Error(`Failed to load WASM JS: ${jsResponse.status}`);
    }
    const jsCode = await jsResponse.text();

    // Load WASM module using dynamic import
    const blob = new Blob([jsCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      wasmModule = await import(blobUrl);
      await wasmModule.default(wasmBytes);
      isInitialized = true;
      URL.revokeObjectURL(blobUrl);

      console.log('[Worker] WASM initialized successfully');
      return { success: true };
    } catch (err) {
      URL.revokeObjectURL(blobUrl);
      throw err;
    }
  } catch (error) {
    console.error('[Worker] Initialization error:', error);
    return { success: false, error: error.message };
  }
}

// Decode QR codes from image data
function decodeQRCode(imageData) {
  if (!isInitialized || !wasmModule) {
    throw new Error('WASM not initialized');
  }

  try {
    const { data, width, height } = imageData;
    const results = wasmModule.decode_qr_from_image(data, width, height);
    return results || [];
  } catch (error) {
    console.error('[Worker] Decode error:', error);
    return [];
  }
}

// Extract MRZ from image data
function extractMRZ(textData) {
  if (!isInitialized || !wasmModule) {
    throw new Error('WASM not initialized');
  }

  try {
    const results = wasmModule.parse_mrz_text(textData);
    return results || {};
  } catch (error) {
    console.error('[Worker] MRZ extraction error:', error);
    return {};
  }
}

// Message handler
self.onmessage = async function(e) {
  const { type, id, payload } = e.data;

  try {
    switch (type) {
      case 'init': {
        const result = await initializeWasm(payload.wasmUrl, payload.wasmJsUrl);
        self.postMessage({
          type: 'init-response',
          id,
          success: result.success,
          error: result.error
        });
        break;
      }

      case 'decode': {
        const results = decodeQRCode(payload.imageData);
        self.postMessage({
          type: 'decode-response',
          id,
          results
        });
        break;
      }
      
      case 'extract-mrz': {
        const results = extractMRZ(payload.textData);
        self.postMessage({
          type: 'extract-mrz-response',
          id,
          results
        });
        break;
      }

      case 'terminate': {
        wasmModule = null;
        isInitialized = false;
        self.close();
        break;
      }

      default:
        console.warn('[Worker] Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({
      type: type + '-error',
      id,
      error: error.message
    });
  }
};
