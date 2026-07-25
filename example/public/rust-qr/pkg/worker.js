/* VeloQR Processing Web Worker
 * author: vkhangstack
 * version: 1.3.1
 * license: MIT
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

// ZXing-WASM state. Loaded lazily (and only once) via dynamic import — the
// same mechanism initializeWasm() below uses for the custom Rust WASM, which
// works inside a classic (non-module) Worker because dynamic import() is a
// runtime feature independent of the worker's script type.
const ZXING_WASM_VERSION = "3.1.2";
const DEFAULT_ZXING_URL = `https://cdn.jsdelivr.net/npm/zxing-wasm@${ZXING_WASM_VERSION}/dist/es/reader/index.js`;
let zxingUrl = null;
let zxingModule = null;
let zxingLoadPromise = null;
let zxingLoadFailed = false;

// Lazily loads zxing-wasm's ESM reader build. Its own WASM binary is fetched
// from jsDelivr by the module itself (no extra wiring needed on our side).
// Returns null (never throws) on failure so callers can treat it as "ZXing
// unavailable" and keep relying on the Rust decoder alone.
function loadZXing() {
	if (zxingModule) return Promise.resolve(zxingModule);
	if (zxingLoadFailed) return Promise.resolve(null);
	if (!zxingLoadPromise) {
		zxingLoadPromise = import(zxingUrl || DEFAULT_ZXING_URL)
			.then((mod) => {
				zxingModule = mod;
				console.log("[Worker] ZXing-WASM loaded successfully");
				return mod;
			})
			.catch((error) => {
				console.warn(
					"[Worker] ZXing-WASM failed to load, continuing without it:",
					error.message,
				);
				zxingLoadFailed = true;
				return null;
			});
	}
	return zxingLoadPromise;
}

// Supplementary decoder used as a last resort after the Rust pipeline's
// stages all miss. ZXing-cpp's binarizer and built-in rotate/invert handling
// catch codes the primary decoder misses — most valuable on Safari/iOS,
// which lack a native BarcodeDetector. Never throws: any failure (load or
// decode) resolves to an empty array, identical in shape to "no QR found".
async function decodeWithZXing(imageData) {
	try {
		const mod = await loadZXing();
		if (!mod) return [];
		const results = await mod.readBarcodes(imageData, { formats: ["QRCode"] });
		return results
			.filter((r) => r.isValid && r.format === "QRCode" && r.text)
			.map((r) => ({
				data: r.text,
				version: 0,
				bounds: r.position
					? [
							[r.position.topLeft.x, r.position.topLeft.y],
							[r.position.topRight.x, r.position.topRight.y],
							[r.position.bottomRight.x, r.position.bottomRight.y],
							[r.position.bottomLeft.x, r.position.bottomLeft.y],
						]
					: [],
			}));
	} catch (error) {
		console.warn("[Worker] ZXing-WASM decode error:", error.message);
		return [];
	}
}

// Load and initialize WASM module
async function initializeWasm(wasmUrl, wasmJsUrl, zxingUrlOverride) {
	if (zxingUrlOverride) {
		zxingUrl = zxingUrlOverride;
	}

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
		const blob = new Blob([jsCode], { type: "application/javascript" });
		const blobUrl = URL.createObjectURL(blob);

		try {
			wasmModule = await import(blobUrl);
			await wasmModule.default(wasmBytes);
			isInitialized = true;
			URL.revokeObjectURL(blobUrl);

			console.log("[Worker] WASM initialized successfully");

			// Warm up ZXing-WASM in the background. Not awaited: failures are
			// non-fatal and must never block the primary decoder from becoming
			// ready.
			loadZXing();

			return { success: true };
		} catch (err) {
			URL.revokeObjectURL(blobUrl);
			throw err;
		}
	} catch (error) {
		console.error("[Worker] Initialization error:", error);
		return { success: false, error: error.message };
	}
}

// Generate sliding windows at different scales and positions
function generateSlidingWindows(
	imageWidth,
	imageHeight,
	scales = [1.0, 0.75, 0.5],
	stride = 0.25,
	maxWindows = 10,
) {
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
		height,
	};
}

// Check if two QR results are duplicates based on content and position overlap
function isDuplicate(result1, result2) {
	// Same content is a strong indicator
	if (result1.data !== result2.data) {
		return false;
	}

	// If we have bounds, check for spatial overlap
	if (
		result1.bounds &&
		result2.bounds &&
		result1.bounds.length >= 4 &&
		result2.bounds.length >= 4
	) {
		// Calculate bounding boxes
		const bbox1 = {
			minX: Math.min(...result1.bounds.map((p) => p[0])),
			maxX: Math.max(...result1.bounds.map((p) => p[0])),
			minY: Math.min(...result1.bounds.map((p) => p[1])),
			maxY: Math.max(...result1.bounds.map((p) => p[1])),
		};

		const bbox2 = {
			minX: Math.min(...result2.bounds.map((p) => p[0])),
			maxX: Math.max(...result2.bounds.map((p) => p[0])),
			minY: Math.min(...result2.bounds.map((p) => p[1])),
			maxY: Math.max(...result2.bounds.map((p) => p[1])),
		};

		// Calculate overlap
		const overlapX = Math.max(
			0,
			Math.min(bbox1.maxX, bbox2.maxX) - Math.max(bbox1.minX, bbox2.minX),
		);
		const overlapY = Math.max(
			0,
			Math.min(bbox1.maxY, bbox2.maxY) - Math.max(bbox1.minY, bbox2.minY),
		);
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
		const isUnique = !unique.some((existing) => isDuplicate(existing, result));
		if (isUnique) {
			unique.push(result);
		}
	}

	return unique;
}

// Decode QR from a single window (internal function).
// When `highQuality` is set, use the WASM high-quality decode path
// (inverted + upscale recovery for low-resolution images) if the running
// WASM build exposes it; otherwise fall back to the standard decode.
function decodeWindow(imageData, highQuality = false) {
	if (!isInitialized || !wasmModule) {
		throw new Error("WASM not initialized");
	}

	try {
		const { data, width, height } = imageData;
		if (
			highQuality &&
			typeof wasmModule.decode_qr_from_image_hq === "function"
		) {
			return wasmModule.decode_qr_from_image_hq(data, width, height) || [];
		}
		const results = wasmModule.decode_qr_from_image(data, width, height);
		return results || [];
	} catch (error) {
		console.error("[Worker] Decode window error:", error);
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
		highQuality = false,
	},
) {
	if (!isInitialized || !wasmModule) {
		throw new Error("WASM not initialized");
	}

	try {
		let processedImageData = imageData;

		// Apply image processing if specified
		if (crop || sharpen) {
			processedImageData = processImage(imageData, { crop, sharpen });
		}

		if (!useSlidingWindow) {
			// Original behavior: decode the full image directly
			return decodeWindow(processedImageData, highQuality);
		}

		// Sliding window approach
		const allResults = [];

		// First, try full image
		const fullImageResults = decodeWindow(processedImageData, highQuality);
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
			maxWindows,
		);

		// Process each window
		for (const window of windows) {
			const windowImageData = extractWindow(processedImageData, window);
			const windowResults = decodeWindow(windowImageData, highQuality);

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
		console.error("[Worker] Decode error:", error);
		return [];
	}
}

// Apply image processing (crop, sharpen)
function processImage(imageData, { crop, sharpen }) {
	let { data, width, height } = imageData;

	try {
		// Apply cropping
		if (crop && crop.width > 0 && crop.height > 0) {
			console.log("[Worker] Cropping image:", crop);
			const croppedData = wasmModule.crop_image(
				data,
				width,
				height,
				crop.x,
				crop.y,
				crop.width,
				crop.height,
			);
			data = croppedData;
			width = crop.width;
			height = crop.height;
		}

		// Apply sharpening
		if (sharpen && sharpen > 0) {
			console.log("[Worker] Sharpening image, amount:", sharpen);
			const sharpenedData = wasmModule.sharpen_image(
				data,
				width,
				height,
				sharpen,
			);
			data = sharpenedData;
		}

		return { data, width, height };
	} catch (error) {
		console.error("[Worker] Image processing error:", error);
		// Return original image data if processing fails
		return imageData;
	}
}

// Extract MRZ from image data
function extractMRZ(textData) {
	if (!isInitialized || !wasmModule) {
		throw new Error("WASM not initialized");
	}

	try {
		const results = wasmModule.parse_mrz_text(textData);
		return results || {};
	} catch (error) {
		console.error("[Worker] MRZ extraction error:", error);
		return {};
	}
}

// Create OffscreenCanvas in worker
function createOffscreenCanvas(width, height) {
	try {
		if (typeof OffscreenCanvas === "undefined") {
			throw new Error("OffscreenCanvas not supported");
		}

		offscreenCanvas = new OffscreenCanvas(width, height);
		offscreenContext = offscreenCanvas.getContext("2d", {
			alpha: false,
			desynchronized: true,
			willReadFrequently: true,
		});

		console.log("[Worker] OffscreenCanvas created:", width, "x", height);
		return { success: true };
	} catch (error) {
		console.error("[Worker] OffscreenCanvas creation error:", error);
		return { success: false, error: error.message };
	}
}

// Update canvas configuration
function updateCanvasConfig(config) {
	// Create canvas if requested
	if (config.createCanvas && config.canvasWidth && config.canvasHeight) {
		const result = createOffscreenCanvas(
			config.canvasWidth,
			config.canvasHeight,
		);
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
	console.log("[Worker] Canvas config updated:", config);
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

// Bilinear upscale for small QR codes (zoom in)
function upscaleImage(imageData, scaleFactor) {
	const { width, height } = imageData;
	const newWidth = Math.floor(width * scaleFactor);
	const newHeight = Math.floor(height * scaleFactor);

	const srcCanvas = new OffscreenCanvas(width, height);
	const srcCtx = srcCanvas.getContext("2d");
	if (!srcCtx) return imageData;

	srcCtx.putImageData(imageData, 0, 0);

	const dstCanvas = new OffscreenCanvas(newWidth, newHeight);
	const dstCtx = dstCanvas.getContext("2d");
	if (!dstCtx) return imageData;

	// Use bicubic-like interpolation for better quality
	dstCtx.imageSmoothingEnabled = true;
	dstCtx.imageSmoothingQuality = "high";
	dstCtx.drawImage(srcCanvas, 0, 0, width, height, 0, 0, newWidth, newHeight);

	return dstCtx.getImageData(0, 0, newWidth, newHeight);
}

// Generate a set of heavily-overlapping region tiles covering the whole frame.
// Centre + four corners at 60% size guarantees that any small QR (up to ~40% of
// the frame) falls fully inside at least one tile — unlike a single centre crop,
// which misses off-centre codes.
function generateRoiTiles(width, height, ratio = 0.6) {
	const w = Math.floor(width * ratio);
	const h = Math.floor(height * ratio);
	const maxX = width - w;
	const maxY = height - h;
	const cx = Math.floor((width - w) / 2);
	const cy = Math.floor((height - h) / 2);

	return [
		{ x: cx, y: cy, width: w, height: h }, // centre
		{ x: 0, y: 0, width: w, height: h }, // top-left
		{ x: maxX, y: 0, width: w, height: h }, // top-right
		{ x: 0, y: maxY, width: w, height: h }, // bottom-left
		{ x: maxX, y: maxY, width: w, height: h }, // bottom-right
	];
}

// Unsharp mask sharpening for better edge detection
function sharpenForQR(imageData, amount = 1.5) {
	const { width, height, data } = imageData;
	const result = new ImageData(width, height);
	const resultData = result.data;

	// Laplacian kernel for edge enhancement
	const kernel = [
		0,
		-amount,
		0,
		-amount,
		1 + 4 * amount,
		-amount,
		0,
		-amount,
		0,
	];

	// Process inner pixels
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			for (let c = 0; c < 3; c++) {
				let sum = 0;
				let ki = 0;
				for (let ky = -1; ky <= 1; ky++) {
					for (let kx = -1; kx <= 1; kx++) {
						const idx = ((y + ky) * width + (x + kx)) * 4 + c;
						sum += data[idx] * kernel[ki++];
					}
				}
				const idx = (y * width + x) * 4 + c;
				resultData[idx] = Math.max(0, Math.min(255, Math.round(sum)));
			}
			resultData[(y * width + x) * 4 + 3] = 255;
		}
	}

	// Copy border pixels
	for (let x = 0; x < width; x++) {
		const topIdx = x * 4;
		const bottomIdx = ((height - 1) * width + x) * 4;
		for (let c = 0; c < 4; c++) {
			resultData[topIdx + c] = data[topIdx + c];
			resultData[bottomIdx + c] = data[bottomIdx + c];
		}
	}
	for (let y = 1; y < height - 1; y++) {
		const leftIdx = y * width * 4;
		const rightIdx = (y * width + width - 1) * 4;
		for (let c = 0; c < 4; c++) {
			resultData[leftIdx + c] = data[leftIdx + c];
			resultData[rightIdx + c] = data[rightIdx + c];
		}
	}

	return result;
}

// Enhance contrast for better QR detection
function enhanceContrast(imageData, factor = 1.4) {
	const { width, height, data } = imageData;
	const result = new ImageData(width, height);
	const resultData = result.data;

	const intercept = 128 * (1 - factor);

	for (let i = 0; i < data.length; i += 4) {
		resultData[i] = Math.max(0, Math.min(255, data[i] * factor + intercept));
		resultData[i + 1] = Math.max(
			0,
			Math.min(255, data[i + 1] * factor + intercept),
		);
		resultData[i + 2] = Math.max(
			0,
			Math.min(255, data[i + 2] * factor + intercept),
		);
		resultData[i + 3] = data[i + 3];
	}

	return result;
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
	const tempCtx = tempCanvas.getContext("2d");

	if (!tempCtx) {
		return imageData;
	}

	// Create temporary canvas with original size
	const srcCanvas = new OffscreenCanvas(width, height);
	const srcCtx = srcCanvas.getContext("2d");

	if (!srcCtx) {
		return imageData;
	}

	srcCtx.putImageData(imageData, 0, 0);

	// Draw scaled down with high quality
	tempCtx.imageSmoothingEnabled = true;
	tempCtx.imageSmoothingQuality = "high";
	tempCtx.drawImage(srcCanvas, 0, 0, width, height, 0, 0, newWidth, newHeight);

	const downscaled = tempCtx.getImageData(0, 0, newWidth, newHeight);

	// Enhance contrast
	const enhanced = new ImageData(newWidth, newHeight);
	const enhancedData = enhanced.data;
	const srcData = downscaled.data;

	const contrastFactor = 1.5;
	const intercept = 128 * (1 - contrastFactor);

	for (let i = 0; i < srcData.length; i += 4) {
		enhancedData[i] = Math.max(
			0,
			Math.min(255, srcData[i] * contrastFactor + intercept),
		);
		enhancedData[i + 1] = Math.max(
			0,
			Math.min(255, srcData[i + 1] * contrastFactor + intercept),
		);
		enhancedData[i + 2] = Math.max(
			0,
			Math.min(255, srcData[i + 2] * contrastFactor + intercept),
		);
		enhancedData[i + 3] = srcData[i + 3];
	}

	return enhanced;
}

// Adaptive contrast normalization using percentile histogram stretching.
// Stretches 2nd-98th percentile luminance range to [0,255].
// Returns original imageData if image is already well-exposed (range <= 4).
function adaptiveNormalize(imageData) {
	const { width, height, data } = imageData;
	const totalPixels = width * height;

	const hist = new Int32Array(256);
	for (let i = 0; i < data.length; i += 4) {
		hist[(data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8]++;
	}

	const lowCut = totalPixels * 0.02;
	const highCut = totalPixels * 0.98;
	let low = 0,
		high = 255,
		cumSum = 0;
	for (let i = 0; i < 256; i++) {
		cumSum += hist[i];
		if (cumSum <= lowCut) low = i;
		if (cumSum <= highCut) high = i;
	}

	if (high <= low + 4) return imageData;

	const scale = 255 / (high - low);
	const result = new ImageData(width, height);
	const rd = result.data;
	for (let i = 0; i < data.length; i += 4) {
		rd[i] = (data[i] - low) * scale;
		rd[i + 1] = (data[i + 1] - low) * scale;
		rd[i + 2] = (data[i + 2] - low) * scale;
		rd[i + 3] = data[i + 3];
	}
	return result;
}

// Estimates image sharpness via Laplacian variance on sparse pixel samples.
// Samples every 4th pixel in both axes (~16x faster than full scan).
// Returns variance — higher = sharper. Below ~50 indicates blur.
function estimateBlur(imageData) {
	const { width, height, data } = imageData;
	const stride = 4;
	let sum = 0,
		sumSq = 0,
		count = 0;

	for (let y = 1; y < height - 1; y += stride) {
		for (let x = 1; x < width - 1; x += stride) {
			const c = (y * width + x) * 4;
			const t = c - width * 4;
			const b = c + width * 4;
			const gc = (data[c] * 77 + data[c + 1] * 150 + data[c + 2] * 29) >> 8;
			const gt = (data[t] * 77 + data[t + 1] * 150 + data[t + 2] * 29) >> 8;
			const gb = (data[b] * 77 + data[b + 1] * 150 + data[b + 2] * 29) >> 8;
			const gl = (data[c - 4] * 77 + data[c - 3] * 150 + data[c - 2] * 29) >> 8;
			const gr = (data[c + 4] * 77 + data[c + 5] * 150 + data[c + 6] * 29) >> 8;
			const lap = Math.abs(4 * gc - gt - gb - gl - gr);
			sum += lap;
			sumSq += lap * lap;
			count++;
		}
	}

	if (count === 0) return 0;
	const mean = sum / count;
	return sumSq / count - mean * mean;
}

// Process video frame with ImageBitmap
async function processVideoFrame(imageBitmap, config = {}) {
	if (!offscreenCanvas || !offscreenContext) {
		throw new Error("OffscreenCanvas not initialized");
	}

	const enableFrameMerging = config.enableFrameMerging || false;
	const resolutionScale =
		config.resolutionScale !== undefined
			? config.resolutionScale
			: currentResolutionScale;
	const crop = config.crop !== undefined ? config.crop : currentCrop;
	const sharpen =
		config.sharpen !== undefined ? config.sharpen : currentSharpen;
	const safariOptimize =
		config.optimizeForSafari !== undefined
			? config.optimizeForSafari
			: optimizeForSafari;

	try {
		// Calculate scaled dimensions
		const scaledWidth = Math.floor(imageBitmap.width * resolutionScale);
		const scaledHeight = Math.floor(imageBitmap.height * resolutionScale);

		// Update canvas size if needed
		if (
			offscreenCanvas.width !== scaledWidth ||
			offscreenCanvas.height !== scaledHeight
		) {
			offscreenCanvas.width = scaledWidth;
			offscreenCanvas.height = scaledHeight;
		}

		// Apply image smoothing for better quality when scaling
		if (resolutionScale !== 1) {
			offscreenContext.imageSmoothingEnabled = true;
			offscreenContext.imageSmoothingQuality = "high";
		}

		// Draw imageBitmap to canvas with scaling
		offscreenContext.drawImage(imageBitmap, 0, 0, scaledWidth, scaledHeight);

		// Get image data
		let imageData = offscreenContext.getImageData(
			0,
			0,
			scaledWidth,
			scaledHeight,
		);

		// Stage 0: try the untouched frame first. A clear QR — the common case the
		// instant a user brings a code into view — decodes immediately without paying
		// for normalization/sharpening, minimising first-detection latency.
		const rawResults = decodeQRCode(imageData, {
			useSlidingWindow: false,
			crop,
			sharpen,
		});
		if (rawResults.length > 0) {
			return {
				success: true,
				results: rawResults,
				canvasWidth: scaledWidth,
				canvasHeight: scaledHeight,
			};
		}

		// Apply pre-processing before decode attempts:
		// Safari path: downscale + fixed contrast (tuned for Safari rendering)
		// Non-Safari path: adaptive contrast normalization + conditional light sharpening
		if (safariOptimize) {
			imageData = optimizeFrameForSafari(imageData);
		} else {
			imageData = adaptiveNormalize(imageData);
			if (estimateBlur(imageData) < 50) {
				imageData = sharpenForQR(imageData, 0.6);
			}
		}

		// Apply frame merging if enabled
		if (enableFrameMerging) {
			addFrameToBuffer(imageData);
			const mergedFrame = getMergedFrame();
			if (mergedFrame) {
				imageData = mergedFrame;
			}
		}

		// Multi-stage detection for small QR codes
		let results = [];

		// Stage 1: Quick direct decode (fast path for normal QR)
		results = decodeQRCode(imageData, {
			useSlidingWindow: false,
			crop,
			sharpen,
		});

		if (results.length > 0) {
			return {
				success: true,
				results,
				canvasWidth: scaledWidth,
				canvasHeight: scaledHeight,
			};
		}

		// Stage 2: Sharpen + sliding window for medium QR
		// const sharpened = sharpenForQR(imageData, 1.2);
		// results = decodeQRCode(sharpened, {
		//   useSlidingWindow: true,
		//   scales: [1.0, 0.8],
		//   stride: 0.3,
		//   maxWindows: 6,
		//   crop,
		//   sharpen: null,
		// });

		// if (results.length > 0) {
		//   return {
		//     success: true,
		//     results,
		//     canvasWidth: scaledWidth,
		//     canvasHeight: scaledHeight,
		//   };
		// }

		// Stage 3: overlapping region tiles + upscale for small / off-centre QR.
		// A single centre crop misses codes placed away from the middle, so sweep a
		// set of overlapping tiles (centre + four corners). Each tile is upscaled so
		// rqrr gets enough pixels per module to lock onto small, high-version codes.
		// Only reached after Stages 1-2 miss, and the scan loop is throttled, so the
		// extra work stays bounded.
		// const tiles = generateRoiTiles(imageData.width, imageData.height, 0.6);
		// for (const tile of tiles) {
		//   const tile2d = extractWindow(imageData, tile);
		//   const tileImageData = new ImageData(tile2d.data, tile2d.width, tile2d.height);

		//   // Cap the upscaled dimension so large (e.g. 1080p) frames don't blow up
		//   // memory/time while still magnifying tiny codes on small frames.
		//   const scale = Math.min(2.5, Math.max(1.5, 1600 / tile2d.width));
		//   const upscaled = upscaleImage(tileImageData, scale);
		//   const enhanced = enhanceContrast(upscaled, 1.3);
		//   const sharpUpscaled = sharpenForQR(enhanced, 1.0);

		//   const tileResults = decodeQRCode(sharpUpscaled, {
		//     useSlidingWindow: false,
		//     crop: null,
		//     sharpen: null,
		//   });

		//   if (tileResults.length > 0) {
		//     // Map bounds from upscaled-tile space back to original coordinates.
		//     for (const result of tileResults) {
		//       if (result.bounds) {
		//         result.bounds = result.bounds.map(([x, y]) => [
		//           Math.round(x / scale + tile.x),
		//           Math.round(y / scale + tile.y),
		//         ]);
		//       }
		//     }
		//     return {
		//       success: true,
		//       results: tileResults,
		//       canvasWidth: scaledWidth,
		//       canvasHeight: scaledHeight,
		//     };
		//   }
		// }

		// Stage 4: ZXing-WASM as a last resort. Only reached once Stages 0-3 (the
		// Rust pipeline's cheapest to most expensive attempts) have all missed,
		// so this cost only lands on the frames that were already the worst case.
		const zxingResults = await decodeWithZXing(imageData);
		if (zxingResults.length > 0) {
			return {
				success: true,
				results: zxingResults,
				canvasWidth: scaledWidth,
				canvasHeight: scaledHeight,
			};
		}

		return {
			success: true,
			results: [],
			canvasWidth: scaledWidth,
			canvasHeight: scaledHeight,
		};
	} catch (error) {
		console.error("[Worker] Frame processing error:", error);
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
			case "init": {
				const result = await initializeWasm(
					payload.wasmUrl,
					payload.wasmJsUrl,
					payload.zxingUrl,
				);
				self.postMessage({
					type: "init-response",
					id,
					success: result.success,
					error: result.error,
				});
				break;
			}

			case "update-config": {
				updateCanvasConfig(payload);
				self.postMessage({
					type: "update-config-response",
					id,
					success: true,
				});
				break;
			}

			case "process-frame": {
				const { imageBitmap, config } = payload;
				const result = await processVideoFrame(imageBitmap, config);
				self.postMessage({
					type: "process-frame-response",
					id,
					success: result.success,
					results: result.results,
					canvasWidth: result.canvasWidth,
					canvasHeight: result.canvasHeight,
					error: result.error,
				});
				break;
			}

			case "decode": {
				const { imageData, ...options } = payload;
				let results = decodeQRCode(imageData, options);
				if (results.length === 0) {
					results = await decodeWithZXing(imageData);
				}
				self.postMessage({
					type: "decode-response",
					id,
					results,
				});
				break;
			}

			case "clear-buffer": {
				frameBuffer = [];
				self.postMessage({
					type: "clear-buffer-response",
					id,
					success: true,
				});
				break;
			}

			case "terminate": {
				wasmModule = null;
				isInitialized = false;
				offscreenCanvas = null;
				offscreenContext = null;
				frameBuffer = [];
				zxingModule = null;
				zxingLoadPromise = null;
				zxingLoadFailed = false;
				self.close();
				break;
			}

			default:
				console.warn("[Worker] Unknown message type:", type);
		}
	} catch (error) {
		self.postMessage({
			type: type + "-error",
			id,
			error: error.message,
		});
	}
};
