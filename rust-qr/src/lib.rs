use wasm_bindgen::prelude::*;
use image::{GrayImage, ImageBuffer, Luma};
use image::imageops::{self, FilterType};
use image::{DynamicImage, RgbaImage};
use rqrr::PreparedImage;
use serde::{Deserialize, Serialize};

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

// ==================== Enhanced QR Detection with Region-based Scanning ====================

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

    // Try standard detection first (fast path)
    let results = detect_qr_standard(&gray_image);
    
    if !results.is_empty() {
        console_log!("Standard detection found {} QR codes", results.len());
        return serde_wasm_bindgen::to_value(&results)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
    }

    // If standard detection fails, try region-based scanning for small QR codes
    console_log!("Standard detection failed, trying region-based scanning...");
    let results = scan_regions_for_qr(&gray_image);

    console_log!("Region-based scanning found {} QR codes", results.len());
    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Standard QR detection (fast path)
fn detect_qr_standard(gray_image: &GrayImage) -> Vec<QRCodeResult> {
    let mut prepared = PreparedImage::prepare(gray_image.clone());
    let grids = prepared.detect_grids();
    
    decode_grids(grids, 1.0, 0.0, 0.0)
}

/// Decode detected grids to QR results
fn decode_grids(grids: Vec<rqrr::Grid>, scale: f32, offset_x: f32, offset_y: f32) -> Vec<QRCodeResult> {
    let mut results: Vec<QRCodeResult> = Vec::new();

    for grid in grids {
        match grid.decode() {
            Ok((meta, content)) => {
                let bounds = grid
                    .bounds
                    .iter()
                    .map(|p| {
                        (
                            (p.x as f32 / scale + offset_x) as f64,
                            (p.y as f32 / scale + offset_y) as f64,
                        )
                    })
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

    results
}

/// Add unique results (avoid duplicates)
fn add_unique_results(
    all_results: &mut Vec<QRCodeResult>,
    found_data: &mut std::collections::HashSet<String>,
    new_results: Vec<QRCodeResult>,
) {
    for result in new_results {
        if !found_data.contains(&result.data) {
            found_data.insert(result.data.clone());
            all_results.push(result);
        }
    }
}

/// Scan image regions for small QR codes
/// Uses overlapping regions with upscaling to detect small QR codes
fn scan_regions_for_qr(gray_image: &GrayImage) -> Vec<QRCodeResult> {
    let (width, height) = gray_image.dimensions();
    let mut all_results: Vec<QRCodeResult> = Vec::new();
    let mut found_data: std::collections::HashSet<String> = std::collections::HashSet::new();

    // Skip region scanning for small images
    if width < 400 || height < 400 {
        return all_results;
    }

    // Scale factors for upscaling regions
    let scale_factors: [f32; 3] = [1.5, 2.0, 2.5];

    // Define overlapping regions (2x2 grid with 2/3 overlap)
    let region_width = width * 2 / 3;
    let region_height = height * 2 / 3;
    let step_x = width / 3;
    let step_y = height / 3;

    for row in 0..2 {
        for col in 0..2 {
            let x = col * step_x;
            let y = row * step_y;
            
            let rx2 = (x + region_width).min(width);
            let ry2 = (y + region_height).min(height);
            let rw = rx2 - x;
            let rh = ry2 - y;

            // Extract region
            let region = imageops::crop_imm(gray_image, x, y, rw, rh).to_image();

            // Try detection on region with different scale factors
            for &scale in &scale_factors {
                let upscaled = upscale_image(&region, scale);
                
                let mut prepared = PreparedImage::prepare(upscaled);
                let grids = prepared.detect_grids();
                
                if !grids.is_empty() {
                    let results = decode_grids(
                        grids,
                        scale,
                        x as f32,
                        y as f32,
                    );
                    add_unique_results(&mut all_results, &mut found_data, results);
                }

                // Early exit if found
                if !all_results.is_empty() {
                    return all_results;
                }
            }
        }
    }

    all_results
}

/// Upscale image using high-quality interpolation
fn upscale_image(gray_image: &GrayImage, scale: f32) -> GrayImage {
    let new_width = (gray_image.width() as f32 * scale) as u32;
    let new_height = (gray_image.height() as f32 * scale) as u32;
    
    // Use Lanczos3 for high quality upscaling
    let dynamic_img = DynamicImage::ImageLuma8(gray_image.clone());
    let resized = dynamic_img.resize_exact(new_width, new_height, FilterType::Lanczos3);
    
    resized.to_luma8()
}

/// Convert RGBA image data to grayscale with enhanced processing
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

            // Standard grayscale conversion formula (ITU-R BT.601)
            let gray_value = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            gray.put_pixel(x, y, Luma([gray_value]));
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
