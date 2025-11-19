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

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
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
            Err(e) => {
                console_log!("Failed to decode QR code: {:?}", e);
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
