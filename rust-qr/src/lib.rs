use wasm_bindgen::prelude::*;
use image::{GrayImage, ImageBuffer};
use image::imageops;
use image::{DynamicImage, RgbaImage};
use rqrr::PreparedImage;
use serde::{Deserialize, Serialize};
use imageproc::contrast::adaptive_threshold;

#[derive(Serialize, Deserialize, Clone)]
pub struct QRCodeResult {
    pub data: String,
    pub version: i32,
    pub bounds: Vec<(f64, f64)>,
}

// Only include console logging in debug builds
#[cfg(debug_assertions)]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Logging macro - only active in debug builds
#[cfg(debug_assertions)]
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// No-op logging in release builds
#[cfg(not(debug_assertions))]
macro_rules! console_log {
    ($($t:tt)*) => {()}
}

/// Decode QR codes from image data (RGBA format)
/// Returns a JSON string containing an array of detected QR codes
#[wasm_bindgen]
pub fn decode_qr_from_image(
    image_data: &[u8],
    width: u32,
    height: u32,
) -> Result<JsValue, JsValue> {
    console_log!("Processing image: {}x{}", width, height);

    // Convert RGBA to grayscale
    let gray_image = rgba_to_gray(image_data, width, height)
        .map_err(|e| JsValue::from_str(&format!("Failed to convert image: {}", e)))?;

    // Prepare image for QR detection
    let mut prepared = PreparedImage::prepare(gray_image);

    // Find QR codes
    let grids = prepared.detect_grids();
    console_log!("Detected {} QR codes", grids.len());

    let mut results: Vec<QRCodeResult> = Vec::new();

    for grid in grids {
        match grid.decode() {
            Ok((meta, content)) => {
                let bounds = grid
                    .bounds
                    .iter()
                    .map(|p| (p.x as f64, p.y as f64))
                    .collect();

                results.push(QRCodeResult {
                    data: content,
                    version: meta.version.0 as i32,
                    bounds,
                });
            }
            Err(_e) => {
                console_log!("Failed to decode QR code: {:?}", _e);
            }
        }
    }

    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Convert RGBA image data to grayscale
fn rgba_to_gray(rgba: &[u8], width: u32, height: u32) -> Result<GrayImage, String> {
    if rgba.len() != (width * height * 4) as usize {
        return Err(format!(
            "Invalid image data length: expected {}, got {}",
            width * height * 4,
            rgba.len()
        ));
    }

    let mut gray = ImageBuffer::new(width, height);

    for y in 0..height {
        for x in 0..width {
            let idx = ((y * width + x) * 4) as usize;
            let r = rgba[idx] as f32;
            let g = rgba[idx + 1] as f32;
            let b = rgba[idx + 2] as f32;

            // Standard grayscale conversion formula
            let gray_value = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            gray.put_pixel(x, y, image::Luma([gray_value]));
        }
    }

    Ok(gray)
}

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    console_log!("QR Scanner WASM module initialized");
}

// ==================== MRZ Parsing Implementation ====================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MRZResult {
    pub document_type: String,  // TD1, TD2, or TD3
    pub document_number: String,
    pub date_of_birth: String,
    pub date_of_expiry: String,
    pub nationality: String,
    pub sex: String,
    pub surname: String,
    pub given_names: String,
    pub optional_data: String,
    pub issuing_country: String,
    pub raw_mrz: Vec<String>,
    pub confidence: f32,
}

/// Parse MRZ text lines to extract structured data
#[wasm_bindgen]
pub fn parse_mrz_text(mrz_text: &str) -> Result<JsValue, JsValue> {
    console_log!("Parsing MRZ text: {}", mrz_text);

    // Split into lines and clean up
    let mrz_lines: Vec<String> = mrz_text
        .lines()
        .map(|l| l.trim().to_uppercase().replace(" ", ""))
        .filter(|l| !l.is_empty() && l.len() >= 20)
        .collect();

    console_log!("Cleaned MRZ lines: {:?}", mrz_lines);

    if mrz_lines.is_empty() {
        return Err(JsValue::from_str("No valid MRZ lines found"));
    }

    // Parse MRZ based on format
    let result = parse_mrz_from_lines(&mrz_lines)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse MRZ: {}", e)))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Parse MRZ lines based on format (TD1, TD2, or TD3)
fn parse_mrz_from_lines(lines: &[String]) -> Result<MRZResult, String> {
    if lines.is_empty() {
        return Err("No MRZ lines found".to_string());
    }

    // Determine MRZ format based on line count and length
    match lines.len() {
        2 => {
            // Could be TD2 or TD3
            if lines[0].len() >= 40 {
                parse_td3(lines)
            } else {
                parse_td2(lines)
            }
        }
        3 => parse_td1(lines),
        _ => Err(format!("Invalid MRZ format: {} lines", lines.len())),
    }
}

/// Parse TD1 format (ID cards: 3 lines of 30 characters)
fn parse_td1(lines: &[String]) -> Result<MRZResult, String> {
    if lines.len() != 3 {
        return Err("TD1 requires 3 lines".to_string());
    }

    let line1 = pad_line(&lines[0], 30);
    let line2 = pad_line(&lines[1], 30);
    let line3 = pad_line(&lines[2], 30);

    Ok(MRZResult {
        document_type: "TD1".to_string(),
        document_number: extract_field(&line1, 5, 14).trim_end_matches('<').to_string(),
        issuing_country: extract_field(&line1, 2, 5).to_string(),
        date_of_birth: extract_field(&line2, 0, 6).replace('O', "0"),
        sex: extract_field(&line2, 7, 8).to_string(),
        date_of_expiry: extract_field(&line2, 8, 14).to_string(),
        nationality: extract_field(&line2, 15, 18).to_string(),
        optional_data: extract_field(&line1, 15, 30).trim_end_matches('<').to_string(),
        surname: extract_names(&line3).0,
        given_names: extract_names(&line3).1,
        raw_mrz: vec![line1, line2, line3],
        confidence: 0.75,
    })
}

/// Parse TD2 format (Official documents: 2 lines of 36 characters)
fn parse_td2(lines: &[String]) -> Result<MRZResult, String> {
    if lines.len() != 2 {
        return Err("TD2 requires 2 lines".to_string());
    }

    let line1 = pad_line(&lines[0], 36);
    let line2 = pad_line(&lines[1], 36);

    let names = extract_names(&extract_field(&line1, 5, 36));

    Ok(MRZResult {
        document_type: "TD2".to_string(),
        issuing_country: extract_field(&line1, 2, 5).to_string(),
        surname: names.0,
        given_names: names.1,
        document_number: extract_field(&line2, 0, 9).trim_end_matches('<').to_string(),
        nationality: extract_field(&line2, 10, 13).to_string(),
        date_of_birth: extract_field(&line2, 13, 19).replace('O', "0"),
        sex: extract_field(&line2, 20, 21).to_string(),
        date_of_expiry: extract_field(&line2, 21, 27).to_string(),
        optional_data: extract_field(&line2, 28, 35).trim_end_matches('<').to_string(),
        raw_mrz: vec![line1, line2],
        confidence: 0.75,
    })
}

/// Parse TD3 format (Passports: 2 lines of 44 characters)
fn parse_td3(lines: &[String]) -> Result<MRZResult, String> {
    if lines.len() != 2 {
        return Err("TD3 requires 2 lines".to_string());
    }

    let line1 = pad_line(&lines[0], 44);
    let line2 = pad_line(&lines[1], 44);

    let names = extract_names(&extract_field(&line1, 5, 44));

    Ok(MRZResult {
        document_type: "TD3".to_string(),
        issuing_country: extract_field(&line1, 2, 5).to_string(),
        surname: names.0,
        given_names: names.1,
        document_number: extract_field(&line2, 0, 9).trim_end_matches('<').to_string(),
        nationality: extract_field(&line2, 10, 13).to_string(),
        date_of_birth: extract_field(&line2, 13, 19).replace('O', "0"),
        sex: extract_field(&line2, 20, 21).to_string(),
        date_of_expiry: extract_field(&line2, 21, 27).to_string(),
        optional_data: extract_field(&line2, 28, 42).trim_end_matches('<').to_string(),
        raw_mrz: vec![line1, line2],
        confidence: 0.75,
    })
}

/// Pad or trim a line to the specified length
fn pad_line(line: &str, length: usize) -> String {
    if line.len() >= length {
        line[..length].to_string()
    } else {
        format!("{:<width$}", line, width = length)
    }
}

/// Extract a field from a line
fn extract_field(line: &str, start: usize, end: usize) -> String {
    if start >= line.len() {
        return String::new();
    }
    let end = end.min(line.len());
    line[start..end].to_string()
}

/// Extract surname and given names from name field
fn extract_names(name_field: &str) -> (String, String) {
    let parts: Vec<&str> = name_field.split("<<").collect();

    let surname = if let Some(s) = parts.get(0) {
        s.replace('<', " ").trim().replace('0', "O")
    } else {
        String::new()
    };

    let given_names = if let Some(s) = parts.get(1) {
        s.replace('<', " ").trim().replace('0', "O")
    } else {
        String::new()
    };

    (surname, given_names)
}

// ==================== Image Processing Implementation ====================

/// Apply adaptive gamma correction to enhance QR code visibility
/// Gamma value is auto-calculated if not provided based on image brightness
#[wasm_bindgen]
pub fn apply_adaptive_gamma(
    image_data: &[u8],
    width: u32,
    height: u32,
    gamma: Option<f32>,
) -> Result<Vec<u8>, JsValue> {
    // Convert RGBA to GrayImage
    let gray = rgba_to_gray(image_data, width, height)
        .map_err(|e| JsValue::from_str(&e))?;

    // Calculate auto gamma if not provided
    let gamma_value = gamma.unwrap_or_else(|| calculate_auto_gamma(&gray));

    console_log!("Applying gamma correction: {}", gamma_value);

    // Apply gamma correction
    let corrected = apply_gamma_correction(&gray, gamma_value);

    // Convert back to RGBA
    let mut rgba_output = vec![0u8; (width * height * 4) as usize];
    for y in 0..height {
        for x in 0..width {
            let gray_value = corrected.get_pixel(x, y)[0];
            let idx = ((y * width + x) * 4) as usize;
            rgba_output[idx] = gray_value;
            rgba_output[idx + 1] = gray_value;
            rgba_output[idx + 2] = gray_value;
            rgba_output[idx + 3] = 255; // Full alpha
        }
    }

    Ok(rgba_output)
}

/// Calculate optimal gamma value based on image brightness
fn calculate_auto_gamma(gray: &GrayImage) -> f32 {
    let total_pixels = (gray.width() * gray.height()) as f32;
    let mean_brightness: f32 = gray.pixels()
        .map(|p| p[0] as f32)
        .sum::<f32>() / total_pixels;

    console_log!("Mean brightness: {}", mean_brightness);

    // Adaptive gamma based on brightness
    if mean_brightness > 180.0 {
        // Too bright (glare) - darken
        0.7
    } else if mean_brightness < 75.0 {
        // Too dark - brighten
        1.5
    } else {
        // Normal range - no correction
        1.0
    }
}

/// Apply gamma correction using lookup table for performance
fn apply_gamma_correction(gray: &GrayImage, gamma: f32) -> GrayImage {
    let mut output = GrayImage::new(gray.width(), gray.height());

    // Build lookup table
    let lut: Vec<u8> = (0..256)
        .map(|i| {
            let normalized = i as f32 / 255.0;
            let corrected = normalized.powf(gamma);
            (corrected * 255.0).min(255.0) as u8
        })
        .collect();

    // Apply LUT
    for (x, y, pixel) in gray.enumerate_pixels() {
        let value = pixel[0];
        output.put_pixel(x, y, image::Luma([lut[value as usize]]));
    }

    output
}

/// Apply adaptive thresholding to improve QR code detection in low contrast scenarios
#[wasm_bindgen]
pub fn apply_adaptive_threshold(
    image_data: &[u8],
    width: u32,
    height: u32,
    block_radius: u32,
) -> Result<Vec<u8>, JsValue> {
    // Convert RGBA to GrayImage
    let gray = rgba_to_gray(image_data, width, height)
        .map_err(|e| JsValue::from_str(&e))?;

    console_log!("Applying adaptive threshold with block_radius: {}", block_radius);

    // Apply adaptive threshold
    // The adaptive_threshold function automatically handles the gaussian weighting
    let thresholded = adaptive_threshold(&gray, block_radius);

    // Convert back to RGBA
    let mut rgba_output = vec![0u8; (width * height * 4) as usize];
    for y in 0..height {
        for x in 0..width {
            let gray_value = thresholded.get_pixel(x, y)[0];
            let idx = ((y * width + x) * 4) as usize;
            rgba_output[idx] = gray_value;
            rgba_output[idx + 1] = gray_value;
            rgba_output[idx + 2] = gray_value;
            rgba_output[idx + 3] = 255; // Full alpha
        }
    }

    Ok(rgba_output)
}

#[wasm_bindgen]
pub fn crop_image(
    image_data: &[u8],
    width: u32,
    height: u32,
    x: u32,
    y: u32,
    crop_width: u32,
    crop_height: u32,
) -> Result<Vec<u8>, JsValue> {
    let img_buffer = match RgbaImage::from_raw(width, height, image_data.to_vec()) {
        Some(buffer) => buffer,
        None => return Err(JsValue::from_str("Failed to create image from buffer")),
    };
    let mut img = DynamicImage::ImageRgba8(img_buffer);

    let cropped_img = imageops::crop_imm(&mut img, x, y, crop_width, crop_height).to_image();

    Ok(cropped_img.into_raw())
}

#[wasm_bindgen]
pub fn sharpen_image(
    image_data: &[u8],
    width: u32,
    height: u32,
    amount: f32,
) -> Result<Vec<u8>, JsValue> {
    let img_buffer = match RgbaImage::from_raw(width, height, image_data.to_vec()) {
        Some(buffer) => buffer,
        None => return Err(JsValue::from_str("Failed to create image from buffer")),
    };
    let img = DynamicImage::ImageRgba8(img_buffer);

    // The unsharpen function in the image crate is actually a sharpen function.
    // The amount is the sigma value for the gaussian blur, and threshold is for the mask.
    let sharpened_img = imageops::unsharpen(&img, amount, 1);

    Ok(sharpened_img.into_raw())
}

/// Advanced sharpening with configurable parameters to reduce noise amplification
#[wasm_bindgen]
pub fn sharpen_image_advanced(
    image_data: &[u8],
    width: u32,
    height: u32,
    sigma: f32,
    amount: f32,
    threshold: i32,
) -> Result<Vec<u8>, JsValue> {
    let img_buffer = match RgbaImage::from_raw(width, height, image_data.to_vec()) {
        Some(buffer) => buffer,
        None => return Err(JsValue::from_str("Failed to create image from buffer")),
    };
    let img = DynamicImage::ImageRgba8(img_buffer);

    console_log!("Advanced sharpen: sigma={}, amount={}, threshold={}", sigma, amount, threshold);

    // Apply unsharp mask with custom parameters
    // sigma: controls blur radius (0.5-2.0)
    // amount: controls sharpening strength (0.5-2.5)
    // threshold: noise reduction threshold (0-10)
    let sharpened_img = imageops::unsharpen(&img, sigma, threshold);

    // Apply additional sharpening if amount > 1.0
    if amount > 1.0 {
        let sharpened_img = imageops::unsharpen(&sharpened_img, sigma * 0.8, threshold);
        Ok(sharpened_img.into_raw())
    } else {
        Ok(sharpened_img.into_raw())
    }
}

/// Advanced upscaling with multiple filter options
/// filter: 0=Nearest, 1=Triangle, 2=CatmullRom, 3=Lanczos3
#[wasm_bindgen]
pub fn upscale_image_advanced(
    image_data: &[u8],
    width: u32,
    height: u32,
    scale_factor: f32,
    filter: u8,
) -> Result<Vec<u8>, JsValue> {
    let img_buffer = match RgbaImage::from_raw(width, height, image_data.to_vec()) {
        Some(buffer) => buffer,
        None => return Err(JsValue::from_str("Failed to create image from buffer")),
    };
    let img = DynamicImage::ImageRgba8(img_buffer);

    let new_width = (width as f32 * scale_factor) as u32;
    let new_height = (height as f32 * scale_factor) as u32;

    let filter_type = match filter {
        0 => imageops::FilterType::Nearest,
        1 => imageops::FilterType::Triangle,
        2 => imageops::FilterType::CatmullRom,
        3 => imageops::FilterType::Lanczos3,
        _ => imageops::FilterType::CatmullRom, // Default to CatmullRom
    };

    console_log!("Upscaling {}x{} to {}x{} with filter {:?}",
                 width, height, new_width, new_height, filter);

    let resized = imageops::resize(&img, new_width, new_height, filter_type);

    Ok(resized.into_raw())
}
