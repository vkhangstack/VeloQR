use wasm_bindgen::prelude::*;
use image::{GrayImage, ImageBuffer};
use image::imageops;
use image::imageops::FilterType;
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

    let results = detect_with_recovery(gray_image);

    results_to_js(&results)
}

/// High-quality decode for low-resolution / hard-to-read still images.
///
/// Runs the normal + inverted passes and, if those miss, retries on a 2x
/// upscaled copy (Lanczos-style interpolation) to recover QR codes whose
/// modules are too small for the detector at native resolution. Detected
/// bounds are mapped back to the original image coordinate space so callers
/// can draw overlays without adjustment.
#[wasm_bindgen]
pub fn decode_qr_from_image_hq(
    image_data: &[u8],
    width: u32,
    height: u32,
) -> Result<JsValue, JsValue> {
    let gray_image = rgba_to_gray(image_data, width, height)
        .map_err(|e| JsValue::from_str(&format!("Failed to convert image: {}", e)))?;

    // Normal + inverted passes at native resolution.
    let mut results = detect_with_recovery(gray_image.clone());

    // Progressive upscale recovery for tiny / fine-detail QR codes. Small images
    // whose modules are only a pixel or two wide can't be resolved at native
    // resolution; upscaling gives the detector more samples per module. We step
    // the scale up and stop at the first factor that decodes, so the extra cost
    // is only paid on a miss and only until something is found.
    if results.is_empty() {
        for scale in UPSCALE_STEPS {
            // Skip factors that would blow past the working-size cap.
            if width * scale > MAX_UPSCALED_DIM || height * scale > MAX_UPSCALED_DIM {
                break;
            }
            results = detect_upscaled(&gray_image, width, height, scale);
            if !results.is_empty() {
                break;
            }
        }
    }

    results_to_js(&results)
}

/// Upscale factors tried, in order, when native-resolution detection misses.
/// Ordered cheapest-first so small QR codes are recovered with the least work.
const UPSCALE_STEPS: [u32; 3] = [2, 3, 4];

/// Cap on any upscaled edge (px). Guards against multiplying an already-large
/// image into a multi-hundred-megapixel buffer during recovery.
const MAX_UPSCALED_DIM: u32 = 4096;

/// Upscale the image by `scale`, run detection with recovery, and map any bounds
/// back into the original coordinate space so overlays line up without callers
/// needing to know a scale factor was applied.
fn detect_upscaled(gray: &GrayImage, width: u32, height: u32, scale: u32) -> Vec<QRCodeResult> {
    let upscaled = imageops::resize(
        gray,
        width * scale,
        height * scale,
        FilterType::Lanczos3,
    );

    let mut results = detect_with_recovery(upscaled);

    let scale_f = scale as f64;
    for result in &mut results {
        for point in &mut result.bounds {
            point.0 /= scale_f;
            point.1 /= scale_f;
        }
    }
    results
}

/// Detect + decode with a white-on-dark recovery pass.
///
/// Runs detection on the image as-is; if nothing decodes, retries once on the
/// inverted image, since many low-quality / low-contrast captures come through
/// as white-on-dark. The inverted pass only runs on a miss, so the fast path is
/// a single detection with no extra allocation beyond the working copy.
fn detect_with_recovery(gray_image: GrayImage) -> Vec<QRCodeResult> {
    // `detect_and_decode` consumes the image, so keep a copy for the fallback.
    let results = detect_and_decode(gray_image.clone());
    if !results.is_empty() {
        return results;
    }
    detect_and_decode(invert_gray(&gray_image))
}

/// Serialize decoded results into a JS value for the WASM boundary.
fn results_to_js(results: &[QRCodeResult]) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(results)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Run QR grid detection + decoding on a prepared grayscale image.
fn detect_and_decode(gray_image: GrayImage) -> Vec<QRCodeResult> {
    let mut prepared = PreparedImage::prepare(gray_image);
    let grids = prepared.detect_grids();
    console_log!("Detected {} QR grids", grids.len());

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
                console_log!("Failed to decode QR grid: {:?}", _e);
            }
        }
    }

    results
}

/// Produce an inverted copy of a grayscale image (255 - value per pixel).
fn invert_gray(gray: &GrayImage) -> GrayImage {
    let mut inverted = gray.clone();
    for pixel in inverted.pixels_mut() {
        pixel.0[0] = 255 - pixel.0[0];
    }
    inverted
}

/// Convert RGBA image data to grayscale.
///
/// Uses integer arithmetic (77·R + 150·G + 29·B) >> 8 — a fixed-point form of
/// the 0.299/0.587/0.114 luma weights — and writes straight into the pixel
/// buffer, avoiding per-pixel float math and bounds-checked `put_pixel` calls.
fn rgba_to_gray(rgba: &[u8], width: u32, height: u32) -> Result<GrayImage, String> {
    let expected = (width as usize) * (height as usize) * 4;
    if rgba.len() != expected {
        return Err(format!(
            "Invalid image data length: expected {}, got {}",
            expected,
            rgba.len()
        ));
    }

    let mut buffer: Vec<u8> = Vec::with_capacity((width as usize) * (height as usize));
    for chunk in rgba.chunks_exact(4) {
        let r = chunk[0] as u32;
        let g = chunk[1] as u32;
        let b = chunk[2] as u32;
        buffer.push(((r * 77 + g * 150 + b * 29) >> 8) as u8);
    }

    ImageBuffer::from_raw(width, height, buffer)
        .ok_or_else(|| "Failed to build grayscale buffer".to_string())
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
