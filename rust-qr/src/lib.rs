use wasm_bindgen::prelude::*;
use image::{GrayImage, ImageBuffer};
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
