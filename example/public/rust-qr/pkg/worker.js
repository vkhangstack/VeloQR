/* VeloQR Processing Web Worker
 * author: vkhangstack
 * version: 1.2.3
 * license: MIT or Apache-2.0
 */

let wasmModule = null;
let isInitialized = false;
let offscreenCanvas = null;
let offscreenContext = null;
let frameBuffer = [];
let maxFrames = 3;
let currentResolutionScale = 1;
let currentCrop = null;
let currentSharpen = null;
let optimizeForSafari = false;

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
    maxWindows = 10,
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

// Create OffscreenCanvas in worker
function createOffscreenCanvas(width, height) {
  try {
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('OffscreenCanvas not supported');
    }

    offscreenCanvas = new OffscreenCanvas(width, height);
    offscreenContext = offscreenCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: true,
    });

    console.log('[Worker] OffscreenCanvas created:', width, 'x', height);
    return { success: true };
  } catch (error) {
    console.error('[Worker] OffscreenCanvas creation error:', error);
    return { success: false, error: error.message };
  }
}

// Update canvas configuration
function updateCanvasConfig(config) {
  // Create canvas if requested
  if (config.createCanvas && config.canvasWidth && config.canvasHeight) {
    const result = createOffscreenCanvas(config.canvasWidth, config.canvasHeight);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  // Update configuration
  if (config.resolutionScale !== undefined) {
    currentResolutionScale = config.resolutionScale;
  }
  if (config.crop !== undefined) {
    currentCrop = config.crop;
  }
  if (config.sharpen !== undefined) {
    currentSharpen = config.sharpen;
  }
  if (config.enableFrameMerging !== undefined) {
    if (config.enableFrameMerging && config.frameMergeCount) {
      maxFrames = config.frameMergeCount;
    } else if (!config.enableFrameMerging) {
      frameBuffer = [];
    }
  }
  if (config.optimizeForSafari !== undefined) {
    optimizeForSafari = config.optimizeForSafari;
  }
  console.log('[Worker] Canvas config updated:', config);
}

// Add frame to buffer for merging
function addFrameToBuffer(imageData) {
  frameBuffer.push(imageData);
  if (frameBuffer.length > maxFrames) {
    frameBuffer.shift();
  }
}

// Merge frames in buffer
function getMergedFrame() {
  if (frameBuffer.length === 0) {
    return null;
  }

  if (frameBuffer.length === 1) {
    return frameBuffer[0];
  }

  const { width, height } = frameBuffer[0];
  const merged = new ImageData(width, height);
  const frameCount = frameBuffer.length;

  // Average pixel values across all frames
  for (let i = 0; i < merged.data.length; i++) {
    let sum = 0;
    for (let f = 0; f < frameCount; f++) {
      sum += frameBuffer[f].data[i];
    }
    merged.data[i] = Math.round(sum / frameCount);
  }

  return merged;
}

// Safari-specific optimization
function optimizeFrameForSafari(imageData) {
  const { width, height, data } = imageData;

  // Downscale to 0.75
  const scale = 0.75;
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);

  // Use OffscreenCanvas for scaling if available
  const tempCanvas = new OffscreenCanvas(newWidth, newHeight);
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) {
    return imageData;
  }

  // Create temporary canvas with original size
  const srcCanvas = new OffscreenCanvas(width, height);
  const srcCtx = srcCanvas.getContext('2d');

  if (!srcCtx) {
    return imageData;
  }

  srcCtx.putImageData(imageData, 0, 0);

  // Draw scaled down with high quality
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';
  tempCtx.drawImage(srcCanvas, 0, 0, width, height, 0, 0, newWidth, newHeight);

  const downscaled = tempCtx.getImageData(0, 0, newWidth, newHeight);

  // Enhance contrast
  const enhanced = new ImageData(newWidth, newHeight);
  const enhancedData = enhanced.data;
  const srcData = downscaled.data;

  const contrastFactor = 1.5;
  const intercept = 128 * (1 - contrastFactor);

  for (let i = 0; i < srcData.length; i += 4) {
    enhancedData[i] = Math.max(0, Math.min(255, srcData[i] * contrastFactor + intercept));
    enhancedData[i + 1] = Math.max(0, Math.min(255, srcData[i + 1] * contrastFactor + intercept));
    enhancedData[i + 2] = Math.max(0, Math.min(255, srcData[i + 2] * contrastFactor + intercept));
    enhancedData[i + 3] = srcData[i + 3];
  }

  return enhanced;
}

// Process video frame with ImageBitmap
function processVideoFrame(imageBitmap, config = {}) {
  if (!offscreenCanvas || !offscreenContext) {
    throw new Error('OffscreenCanvas not initialized');
  }

  const enableFrameMerging = config.enableFrameMerging || false;
  const resolutionScale = config.resolutionScale !== undefined ? config.resolutionScale : currentResolutionScale;
  const crop = config.crop !== undefined ? config.crop : currentCrop;
  const sharpen = config.sharpen !== undefined ? config.sharpen : currentSharpen;
  const safariOptimize = config.optimizeForSafari !== undefined ? config.optimizeForSafari : optimizeForSafari;

  try {
    // Calculate scaled dimensions
    const scaledWidth = Math.floor(imageBitmap.width * resolutionScale);
    const scaledHeight = Math.floor(imageBitmap.height * resolutionScale);

    // Update canvas size if needed
    if (offscreenCanvas.width !== scaledWidth || offscreenCanvas.height !== scaledHeight) {
      offscreenCanvas.width = scaledWidth;
      offscreenCanvas.height = scaledHeight;
    }

    // Apply image smoothing for better quality when scaling
    if (resolutionScale !== 1) {
      offscreenContext.imageSmoothingEnabled = true;
      offscreenContext.imageSmoothingQuality = 'high';
    }

    // Draw imageBitmap to canvas with scaling
    offscreenContext.drawImage(imageBitmap, 0, 0, scaledWidth, scaledHeight);

    // Get image data
    let imageData = offscreenContext.getImageData(0, 0, scaledWidth, scaledHeight);

    // Apply Safari optimization if enabled
    if (safariOptimize) {
      imageData = optimizeFrameForSafari(imageData);
    }

    // Apply frame merging if enabled
    if (enableFrameMerging) {
      addFrameToBuffer(imageData);
      const mergedFrame = getMergedFrame();
      if (mergedFrame) {
        imageData = mergedFrame;
      }
    }

    // Decode QR codes with crop and sharpen options
    const results = decodeQRCode(imageData, {
      useSlidingWindow: false, // Direct decode for performance
      crop,
      sharpen,
    });

    return {
      success: true,
      results,
      canvasWidth: scaledWidth,
      canvasHeight: scaledHeight,
    };
  } catch (error) {
    console.error('[Worker] Frame processing error:', error);
    return {
      success: false,
      error: error.message,
      results: [],
    };
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

      case 'update-config': {
        updateCanvasConfig(payload);
        self.postMessage({
          type: 'update-config-response',
          id,
          success: true,
        });
        break;
      }

      case 'process-frame': {
        const { imageBitmap, config } = payload;
        const result = processVideoFrame(imageBitmap, config);
        self.postMessage({
          type: 'process-frame-response',
          id,
          success: result.success,
          results: result.results,
          canvasWidth: result.canvasWidth,
          canvasHeight: result.canvasHeight,
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

      case 'clear-buffer': {
        frameBuffer = [];
        self.postMessage({
          type: 'clear-buffer-response',
          id,
          success: true,
        });
        break;
      }

      case 'terminate': {
        wasmModule = null;
        isInitialized = false;
        offscreenCanvas = null;
        offscreenContext = null;
        frameBuffer = [];
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
