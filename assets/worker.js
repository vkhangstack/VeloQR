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

// Generate sliding windows at different scales and positions
function generateSlidingWindows(imageWidth, imageHeight, scales = [1.0, 0.75, 0.5], stride = 0.25, maxWindows = 10) {
  const windows = [];

  for (const scale of scales) {
    const windowWidth = Math.floor(imageWidth * scale);
    const windowHeight = Math.floor(imageHeight * scale);

    const stepX = Math.max(1, Math.floor(windowWidth * stride));
    const stepY = Math.max(1, Math.floor(windowHeight * stride));

    for (let y = 0; y <= imageHeight - windowHeight; y += stepY) {
      for (let x = 0; x <= imageWidth - windowWidth; x += stepX) {
        windows.push({
          x,
          y,
          width: windowWidth,
          height: windowHeight,
          scale,
        });

        // Limit number of windows for performance on mobile
        if (maxWindows && windows.length >= maxWindows) {
          return windows;
        }
      }
    }
  }

  return windows;
}

// Extract a window region from ImageData
function extractWindow(imageData, window) {
  const { x, y, width, height } = window;
  const { data: srcData, width: srcWidth } = imageData;

  const windowData = new Uint8ClampedArray(width * height * 4);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcX = x + col;
      const srcY = y + row;
      const srcIndex = (srcY * srcWidth + srcX) * 4;
      const dstIndex = (row * width + col) * 4;

      windowData[dstIndex] = srcData[srcIndex];
      windowData[dstIndex + 1] = srcData[srcIndex + 1];
      windowData[dstIndex + 2] = srcData[srcIndex + 2];
      windowData[dstIndex + 3] = srcData[srcIndex + 3];
    }
  }

  return {
    data: windowData,
    width,
    height
  };
}

// Check if two QR results are duplicates based on content and position overlap
function isDuplicate(result1, result2) {
  // Same content is a strong indicator
  if (result1.data !== result2.data) {
    return false;
  }

  // If we have bounds, check for spatial overlap
  if (result1.bounds && result2.bounds && result1.bounds.length >= 4 && result2.bounds.length >= 4) {
    // Calculate bounding boxes
    const bbox1 = {
      minX: Math.min(...result1.bounds.map(p => p[0])),
      maxX: Math.max(...result1.bounds.map(p => p[0])),
      minY: Math.min(...result1.bounds.map(p => p[1])),
      maxY: Math.max(...result1.bounds.map(p => p[1])),
    };

    const bbox2 = {
      minX: Math.min(...result2.bounds.map(p => p[0])),
      maxX: Math.max(...result2.bounds.map(p => p[0])),
      minY: Math.min(...result2.bounds.map(p => p[1])),
      maxY: Math.max(...result2.bounds.map(p => p[1])),
    };

    // Calculate overlap
    const overlapX = Math.max(0, Math.min(bbox1.maxX, bbox2.maxX) - Math.max(bbox1.minX, bbox2.minX));
    const overlapY = Math.max(0, Math.min(bbox1.maxY, bbox2.maxY) - Math.max(bbox1.minY, bbox2.minY));
    const overlapArea = overlapX * overlapY;

    const area1 = (bbox1.maxX - bbox1.minX) * (bbox1.maxY - bbox1.minY);
    const area2 = (bbox2.maxX - bbox2.minX) * (bbox2.maxY - bbox2.minY);

    // Consider duplicate if overlap is > 50% of either area
    const overlapRatio1 = overlapArea / area1;
    const overlapRatio2 = overlapArea / area2;

    return overlapRatio1 > 0.5 || overlapRatio2 > 0.5;
  }

  // If no bounds, just check content equality
  return true;
}

// Deduplicate QR results
function deduplicateResults(results) {
  const unique = [];

  for (const result of results) {
    const isUnique = !unique.some(existing => isDuplicate(existing, result));
    if (isUnique) {
      unique.push(result);
    }
  }

  return unique;
}

// Decode QR from a single window (internal function)
function decodeWindow(imageData) {
  if (!isInitialized || !wasmModule) {
    throw new Error('WASM not initialized');
  }

  try {
    const { data, width, height } = imageData;
    const results = wasmModule.decode_qr_from_image(data, width, height);
    return results || [];
  } catch (error) {
    console.error('[Worker] Decode window error:', error);
    return [];
  }
}

// Decode QR codes from image data with optional sliding window
function decodeQRCode(
  imageData,
  {
    useSlidingWindow = true,
    scales = [1.0, 0.75, 0.5],
    stride = 0.25,
    maxWindows = 2,
    crop = null,
    sharpen = null,
  }
) {
  if (!isInitialized || !wasmModule) {
    throw new Error('WASM not initialized');
  }

  try {
    let processedImageData = imageData;

    // Apply image processing if specified
    if (crop || sharpen) {
      processedImageData = processImage(imageData, { crop, sharpen });
    }

    if (!useSlidingWindow) {
      // Original behavior: decode the full image directly
      return decodeWindow(processedImageData);
    }

    // Sliding window approach
    const allResults = [];

    // First, try full image
    const fullImageResults = decodeWindow(processedImageData);
    allResults.push(...fullImageResults);

    // Early exit if we found QR codes in full image (performance optimization)
    if (fullImageResults.length > 0) {
      return fullImageResults;
    }

    // Generate windows only if full image scan failed
    const windows = generateSlidingWindows(
      processedImageData.width,
      processedImageData.height,
      scales,
      stride,
      maxWindows
    );

    // Process each window
    for (const window of windows) {
      const windowImageData = extractWindow(processedImageData, window);
      const windowResults = decodeWindow(windowImageData);

      // Adjust bounds to global coordinates
      for (const result of windowResults) {
        if (result.bounds) {
          result.bounds = result.bounds.map(([x, y]) => [
            x + window.x,
            y + window.y,
          ]);
        }
        allResults.push(result);
      }

      // Early exit immediately when we find QR codes
      if (windowResults.length > 0) {
        break;
      }
    }

    // Deduplicate results
    return deduplicateResults(allResults);
  } catch (error) {
    console.error('[Worker] Decode error:', error);
    return [];
  }
}

// Apply image processing (crop, sharpen)
function processImage(imageData, { crop, sharpen }) {
  let { data, width, height } = imageData;

  try {
    // Apply cropping
    if (crop && crop.width > 0 && crop.height > 0) {
      console.log('[Worker] Cropping image:', crop);
      const croppedData = wasmModule.crop_image(
        data,
        width,
        height,
        crop.x,
        crop.y,
        crop.width,
        crop.height
      );
      data = croppedData;
      width = crop.width;
      height = crop.height;
    }

    // Apply sharpening
    if (sharpen && sharpen > 0) {
      console.log('[Worker] Sharpening image, amount:', sharpen);
      const sharpenedData = wasmModule.sharpen_image(
        data,
        width,
        height,
        sharpen
      );
      data = sharpenedData;
    }

    return { data, width, height };
  } catch (error) {
    console.error('[Worker] Image processing error:', error);
    // Return original image data if processing fails
    return imageData;
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
self.onmessage = async function (e) {
  const { type, id, payload } = e.data;

  try {
    switch (type) {
      case 'init': {
        const result = await initializeWasm(payload.wasmUrl, payload.wasmJsUrl);
        self.postMessage({
          type: 'init-response',
          id,
          success: result.success,
          error: result.error,
        });
        break;
      }

      case 'decode': {
        const { imageData, ...options } = payload;
        const results = decodeQRCode(imageData, options);
        self.postMessage({
          type: 'decode-response',
          id,
          results,
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
      error: error.message,
    });
  }
};
