use wasm_bindgen::prelude::*;
use image::{GrayImage, ImageBuffer, DynamicImage};
use serde::{Deserialize, Serialize};
use ndarray::Array4;
use std::sync::Mutex;

#[cfg(debug_assertions)]
macro_rules! console_log {
    ($($t:tt)*) => {
        web_sys::console::log_1(&format_args!($($t)*).to_string().into())
    }
}

#[cfg(not(debug_assertions))]
macro_rules! console_log {
    ($($t:tt)*) => {()}
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OCRResult {
    pub text: String,
    pub confidence: f32,
    pub bounds: Option<Vec<(f64, f64)>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OCRBoundingBox {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub text: String,
    pub confidence: f32,
}

// OCR model state - simplified for WASM (no heavy ONNX runtime)
static OCR_MODEL_INITIALIZED: Mutex<bool> = Mutex::new(false);

// Character set for MRZ OCR
const MRZ_CHARSET: &str = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<";

/// Initialize OCR model (simplified - just marks as ready)
/// In production, you would load a lightweight model or use external OCR service
#[wasm_bindgen]
pub fn init_ocr_model(_model_bytes: &[u8]) -> Result<(), JsValue> {
    console_log!("Initializing OCR model (simplified mode)");
    
    let mut initialized = OCR_MODEL_INITIALIZED.lock()
        .map_err(|e| JsValue::from_str(&format!("Failed to lock: {}", e)))?;
    *initialized = true;
    
    console_log!("OCR model initialized successfully");
    Ok(())
}

/// Check if OCR model is initialized
#[wasm_bindgen]
pub fn is_ocr_model_initialized() -> bool {
    OCR_MODEL_INITIALIZED.lock().map(|g| *g).unwrap_or(false)
}

/// Perform OCR inference on image data
#[wasm_bindgen]
pub fn ocr_inference(
    image_data: &[u8],
    width: u32,
    height: u32,
) -> Result<JsValue, JsValue> {
    console_log!("Starting OCR inference on {}x{} image", width, height);
    
    // Check if model is initialized
    let initialized = OCR_MODEL_INITIALIZED.lock()
        .map_err(|e| JsValue::from_str(&format!("Failed to lock: {}", e)))?;
    
    if !*initialized {
        return Err(JsValue::from_str("OCR model not initialized. Call init_ocr_model first."));
    }
    drop(initialized);
    
    // Preprocess image
    let preprocessed = preprocess_for_ocr(image_data, width, height)?;
    
    // Run inference (simplified version - in production, use tract-onnx)
    let result = run_ocr_inference(&preprocessed)?;
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Perform OCR on a specific region of interest
#[wasm_bindgen]
pub fn ocr_inference_region(
    image_data: &[u8],
    width: u32,
    height: u32,
    x: u32,
    y: u32,
    roi_width: u32,
    roi_height: u32,
) -> Result<JsValue, JsValue> {
    console_log!("OCR inference on region: ({}, {}) {}x{}", x, y, roi_width, roi_height);
    
    // Crop to region of interest
    let cropped = crop_region(image_data, width, height, x, y, roi_width, roi_height)?;
    
    // Run OCR on cropped region
    ocr_inference(&cropped, roi_width, roi_height)
}

/// Detect text regions in image (text detection)
#[wasm_bindgen]
pub fn detect_text_regions(
    image_data: &[u8],
    width: u32,
    height: u32,
) -> Result<JsValue, JsValue> {
    console_log!("Detecting text regions in {}x{} image", width, height);
    
    // Preprocess image
    let gray = rgba_to_gray(image_data, width, height)?;
    
    // Detect text regions using simple edge detection and contours
    let regions = detect_text_boxes(&gray, width, height)?;
    
    serde_wasm_bindgen::to_value(&regions)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Preprocess image for OCR inference
fn preprocess_for_ocr(
    image_data: &[u8],
    width: u32,
    height: u32,
) -> Result<Array4<f32>, JsValue> {
    // Convert to grayscale
    let gray = rgba_to_gray(image_data, width, height)?;
    
    // Resize to model input size (typically 32x128 for text recognition)
    let target_height = 32;
    let target_width = 128;
    
    let resized = resize_image(&gray, width, height, target_width, target_height)?;
    
    // Normalize to [0, 1]
    let mut input = Array4::<f32>::zeros((1, 1, target_height as usize, target_width as usize));
    
    for y in 0..target_height {
        for x in 0..target_width {
            let pixel = resized.get_pixel(x, y)[0];
            input[[0, 0, y as usize, x as usize]] = pixel as f32 / 255.0;
        }
    }
    
    Ok(input)
}

/// Run OCR inference (simplified - uses pattern matching and preprocessing)
/// For production, integrate with external OCR service or use Tesseract.js
fn run_ocr_inference(_input: &Array4<f32>) -> Result<OCRResult, JsValue> {
    console_log!("Running simplified OCR inference with input shape: {:?}", input.shape());
    
    // Check if initialized
    let initialized = OCR_MODEL_INITIALIZED.lock()
        .map_err(|e| JsValue::from_str(&format!("Failed to lock: {}", e)))?;
    
    if !*initialized {
        return Err(JsValue::from_str("OCR model not initialized"));
    }
    
    // Simplified OCR: Use pattern matching and character recognition
    // In production, you would:
    // 1. Use Tesseract.js for client-side OCR
    // 2. Call external OCR API
    // 3. Use a lightweight WASM-compatible OCR model
    
    // For now, return a placeholder that indicates OCR is needed
    Ok(OCRResult {
        text: String::new(), // Empty - will be filled by external OCR
        confidence: 0.0,
        bounds: None,
    })
}

/// Detect text bounding boxes in image
fn detect_text_boxes(
    gray: &GrayImage,
    width: u32,
    height: u32,
) -> Result<Vec<OCRBoundingBox>, JsValue> {
    // Simplified text detection using edge detection
    // In production, use a proper text detection model (e.g., EAST, CRAFT)
    
    let mut boxes = Vec::new();
    
    // Apply simple thresholding
    let threshold = 128u8;
    let mut binary = GrayImage::new(width, height);
    
    for y in 0..height {
        for x in 0..width {
            let pixel = gray.get_pixel(x, y)[0];
            let value = if pixel > threshold { 255 } else { 0 };
            binary.put_pixel(x, y, image::Luma([value]));
        }
    }
    
    // Find connected components (simplified)
    // In production, use proper connected component analysis
    
    // Example: detect horizontal text lines
    let line_height = 32;
    let step = line_height / 2;
    
    for y in (0..height).step_by(step as usize) {
        if y + line_height > height {
            break;
        }
        
        // Check if this region has text
        let mut has_text = false;
        let mut min_x = width;
        let mut max_x = 0;
        
        for scan_y in y..(y + line_height).min(height) {
            for x in 0..width {
                if binary.get_pixel(x, scan_y)[0] > 0 {
                    has_text = true;
                    min_x = min_x.min(x);
                    max_x = max_x.max(x);
                }
            }
        }
        
        if has_text && max_x > min_x {
            boxes.push(OCRBoundingBox {
                x: min_x as f64,
                y: y as f64,
                width: (max_x - min_x) as f64,
                height: line_height as f64,
                text: String::new(),
                confidence: 0.0,
            });
        }
    }
    
    console_log!("Detected {} text regions", boxes.len());
    Ok(boxes)
}

/// Convert RGBA to grayscale
fn rgba_to_gray(rgba: &[u8], width: u32, height: u32) -> Result<GrayImage, JsValue> {
    if rgba.len() != (width * height * 4) as usize {
        return Err(JsValue::from_str(&format!(
            "Invalid image data length: expected {}, got {}",
            width * height * 4,
            rgba.len()
        )));
    }
    
    let mut gray = ImageBuffer::new(width, height);
    
    for y in 0..height {
        for x in 0..width {
            let idx = ((y * width + x) * 4) as usize;
            let r = rgba[idx] as f32;
            let g = rgba[idx + 1] as f32;
            let b = rgba[idx + 2] as f32;
            
            let gray_value = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            gray.put_pixel(x, y, image::Luma([gray_value]));
        }
    }
    
    Ok(gray)
}

/// Resize grayscale image
fn resize_image(
    img: &GrayImage,
    _src_width: u32,
    _src_height: u32,
    dst_width: u32,
    dst_height: u32,
) -> Result<GrayImage, JsValue> {
    let dynamic_img = DynamicImage::ImageLuma8(img.clone());
    let resized = dynamic_img.resize_exact(
        dst_width,
        dst_height,
        image::imageops::FilterType::Lanczos3,
    );
    
    match resized {
        DynamicImage::ImageLuma8(gray) => Ok(gray),
        _ => Err(JsValue::from_str("Failed to resize image")),
    }
}

/// Crop region from RGBA image
fn crop_region(
    rgba: &[u8],
    width: u32,
    height: u32,
    x: u32,
    y: u32,
    crop_width: u32,
    crop_height: u32,
) -> Result<Vec<u8>, JsValue> {
    if x + crop_width > width || y + crop_height > height {
        return Err(JsValue::from_str("Crop region out of bounds"));
    }
    
    let mut cropped = Vec::with_capacity((crop_width * crop_height * 4) as usize);
    
    for cy in 0..crop_height {
        for cx in 0..crop_width {
            let src_idx = (((y + cy) * width + (x + cx)) * 4) as usize;
            cropped.push(rgba[src_idx]);
            cropped.push(rgba[src_idx + 1]);
            cropped.push(rgba[src_idx + 2]);
            cropped.push(rgba[src_idx + 3]);
        }
    }
    
    Ok(cropped)
}

/// Batch OCR inference on multiple regions
#[wasm_bindgen]
pub fn ocr_inference_batch(
    image_data: &[u8],
    width: u32,
    height: u32,
    regions: JsValue,
) -> Result<JsValue, JsValue> {
    let regions: Vec<OCRBoundingBox> = serde_wasm_bindgen::from_value(regions)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse regions: {}", e)))?;
    
    console_log!("Running batch OCR on {} regions", regions.len());
    
    let mut results = Vec::new();
    
    for region in regions {
        let x = region.x as u32;
        let y = region.y as u32;
        let w = region.width as u32;
        let h = region.height as u32;
        
        match ocr_inference_region(image_data, width, height, x, y, w, h) {
            Ok(result_js) => {
                if let Ok(mut result) = serde_wasm_bindgen::from_value::<OCRResult>(result_js) {
                    result.bounds = Some(vec![
                        (region.x, region.y),
                        (region.x + region.width, region.y),
                        (region.x + region.width, region.y + region.height),
                        (region.x, region.y + region.height),
                    ]);
                    results.push(result);
                }
            }
            Err(_e) => {
                console_log!("Failed to process region: {:?}", _e);
            }
        }
    }
    
    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

// ==================== MRZ OCR Functions ====================

/// OCR inference specifically optimized for MRZ text
#[wasm_bindgen]
pub fn ocr_mrz_inference(
    image_data: &[u8],
    width: u32,
    height: u32,
) -> Result<JsValue, JsValue> {
    console_log!("Starting MRZ OCR inference on {}x{} image", width, height);
    
    // Check if model is initialized
    let initialized = OCR_MODEL_INITIALIZED.lock()
        .map_err(|e| JsValue::from_str(&format!("Failed to lock: {}", e)))?;
    
    if !*initialized {
        return Err(JsValue::from_str("OCR model not initialized. Call init_ocr_model first."));
    }
    drop(initialized);
    
    // Preprocess for MRZ (optimized settings)
    let preprocessed = preprocess_for_mrz(image_data, width, height)?;
    
    // Run inference
    let result = run_ocr_inference(&preprocessed)?;
    
    // Post-process MRZ text
    let mrz_text = postprocess_mrz_text(&result.text);
    
    let mrz_result = OCRResult {
        text: mrz_text,
        confidence: result.confidence,
        bounds: result.bounds,
    };
    
    serde_wasm_bindgen::to_value(&mrz_result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Preprocess image specifically for MRZ recognition
fn preprocess_for_mrz(
    image_data: &[u8],
    width: u32,
    height: u32,
) -> Result<Array4<f32>, JsValue> {
    // Convert to grayscale
    let gray = rgba_to_gray(image_data, width, height)?;
    
    // Apply adaptive binarization for MRZ
    let binary = adaptive_threshold(&gray, 15, 10.0);
    
    // MRZ-specific dimensions (height 32, variable width based on aspect ratio)
    let target_height = 32u32;
    let aspect_ratio = width as f32 / height as f32;
    let target_width = ((target_height as f32 * aspect_ratio) as u32).max(128).min(512);
    
    let resized = resize_image(&binary, width, height, target_width, target_height)?;
    
    // Normalize to [-1, 1] for better model performance
    let mut input = Array4::<f32>::zeros((1, 1, target_height as usize, target_width as usize));
    
    for y in 0..target_height {
        for x in 0..target_width {
            let pixel = resized.get_pixel(x, y)[0];
            input[[0, 0, y as usize, x as usize]] = (pixel as f32 / 127.5) - 1.0;
        }
    }
    
    Ok(input)
}

/// Adaptive threshold for better MRZ binarization
fn adaptive_threshold(gray: &GrayImage, block_size: u32, c: f32) -> GrayImage {
    let (width, height) = gray.dimensions();
    let mut result = GrayImage::new(width, height);
    let half_block = (block_size / 2) as i32;
    
    for y in 0..height {
        for x in 0..width {
            // Calculate local mean
            let mut sum = 0u32;
            let mut count = 0u32;
            
            for dy in -half_block..=half_block {
                for dx in -half_block..=half_block {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;
                    
                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        sum += gray.get_pixel(nx as u32, ny as u32)[0] as u32;
                        count += 1;
                    }
                }
            }
            
            let mean = sum as f32 / count as f32;
            let threshold = mean - c;
            let pixel = gray.get_pixel(x, y)[0];
            
            let value = if (pixel as f32) > threshold { 255 } else { 0 };
            result.put_pixel(x, y, image::Luma([value]));
        }
    }
    
    result
}

/// Post-process OCR output for MRZ format
fn postprocess_mrz_text(text: &str) -> String {
    // Clean up common OCR errors in MRZ
    text.chars()
        .filter(|c| MRZ_CHARSET.contains(*c) || *c == '\n')
        .map(|c| {
            // Common substitutions
            match c {
                'O' if false => '0', // Context-dependent
                'I' if false => '1',
                'S' if false => '5',
                'B' if false => '8',
                _ => c
            }
        })
        .collect()
}

/// Detect MRZ lines in image and return OCR results for each line
#[wasm_bindgen]
pub fn ocr_mrz_lines(
    image_data: &[u8],
    width: u32,
    height: u32,
) -> Result<JsValue, JsValue> {
    console_log!("Detecting and OCR-ing MRZ lines in {}x{} image", width, height);
    
    // Convert to grayscale
    let gray = rgba_to_gray(image_data, width, height)?;
    
    // Detect text lines using horizontal projection
    let lines = detect_mrz_lines(&gray, width, height)?;
    
    console_log!("Detected {} potential MRZ lines", lines.len());
    
    let mut results: Vec<OCRResult> = Vec::new();
    
    for (line_y, line_height) in lines {
        // Extract line region
        let line_data = crop_region(
            image_data, width, height,
            0, line_y, width, line_height
        )?;
        
        // Run OCR on line
        match ocr_mrz_inference(&line_data, width, line_height) {
            Ok(result_js) => {
                if let Ok(mut result) = serde_wasm_bindgen::from_value::<OCRResult>(result_js) {
                    result.bounds = Some(vec![
                        (0.0, line_y as f64),
                        (width as f64, line_y as f64),
                        (width as f64, (line_y + line_height) as f64),
                        (0.0, (line_y + line_height) as f64),
                    ]);
                    results.push(result);
                }
            }
            Err(_e) => {
                console_log!("Failed to OCR line at y={}: {:?}", line_y, _e);
            }
        }
    }
    
    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Detect MRZ text lines using horizontal projection
fn detect_mrz_lines(
    gray: &GrayImage,
    width: u32,
    height: u32,
) -> Result<Vec<(u32, u32)>, JsValue> {
    // Calculate horizontal projection
    let mut projection: Vec<u32> = vec![0; height as usize];
    
    for y in 0..height {
        for x in 0..width {
            let pixel = gray.get_pixel(x, y)[0];
            if pixel < 128 { // Dark pixel (text)
                projection[y as usize] += 1;
            }
        }
    }
    
    // Find peaks (text lines)
    let threshold = (width as f32 * 0.1) as u32; // At least 10% of width has text
    let mut lines: Vec<(u32, u32)> = Vec::new();
    let mut in_line = false;
    let mut line_start = 0u32;
    
    for y in 0..height {
        if projection[y as usize] > threshold {
            if !in_line {
                in_line = true;
                line_start = y;
            }
        } else {
            if in_line {
                in_line = false;
                let line_height = y - line_start;
                if line_height >= 10 { // Minimum line height
                    lines.push((line_start, line_height));
                }
            }
        }
    }
    
    // Handle case where line extends to bottom
    if in_line {
        let line_height = height - line_start;
        if line_height >= 10 {
            lines.push((line_start, line_height));
        }
    }
    
    // Filter to keep only bottom lines (MRZ is at bottom)
    // Keep last 2-3 lines depending on document type
    let mrz_lines: Vec<(u32, u32)> = if lines.len() > 3 {
        lines.into_iter().rev().take(3).rev().collect()
    } else {
        lines
    };
    
    Ok(mrz_lines)
}

/// Combined MRZ detection and OCR - returns parsed MRZ result
#[wasm_bindgen]
pub fn detect_and_ocr_mrz(
    image_data: &[u8],
    width: u32,
    height: u32,
) -> Result<JsValue, JsValue> {
    console_log!("Running full MRZ detection and OCR pipeline");
    
    // Step 1: Detect MRZ lines
    let lines_result = ocr_mrz_lines(image_data, width, height)?;
    let lines: Vec<OCRResult> = serde_wasm_bindgen::from_value(lines_result)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse lines: {}", e)))?;
    
    if lines.is_empty() {
        return Err(JsValue::from_str("No MRZ lines detected"));
    }
    
    // Step 2: Combine line texts
    let mrz_text: String = lines.iter()
        .map(|l| l.text.clone())
        .collect::<Vec<_>>()
        .join("\n");
    
    console_log!("Combined MRZ text:\n{}", mrz_text);
    
    // Step 3: Parse MRZ using existing parser
    crate::parse_mrz_text(&mrz_text)
}
