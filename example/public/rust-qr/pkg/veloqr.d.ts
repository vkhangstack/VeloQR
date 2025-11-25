/* tslint:disable */
/* eslint-disable */
/**
 * Initialize OCR model (simplified - just marks as ready)
 * In production, you would load a lightweight model or use external OCR service
 */
export function init_ocr_model(_model_bytes: Uint8Array): void;
/**
 * Check if OCR model is initialized
 */
export function is_ocr_model_initialized(): boolean;
/**
 * Perform OCR inference on image data
 */
export function ocr_inference(image_data: Uint8Array, width: number, height: number): any;
/**
 * Perform OCR on a specific region of interest
 */
export function ocr_inference_region(image_data: Uint8Array, width: number, height: number, x: number, y: number, roi_width: number, roi_height: number): any;
/**
 * Detect text regions in image (text detection)
 */
export function detect_text_regions(image_data: Uint8Array, width: number, height: number): any;
/**
 * Batch OCR inference on multiple regions
 */
export function ocr_inference_batch(image_data: Uint8Array, width: number, height: number, regions: any): any;
/**
 * OCR inference specifically optimized for MRZ text
 */
export function ocr_mrz_inference(image_data: Uint8Array, width: number, height: number): any;
/**
 * Detect MRZ lines in image and return OCR results for each line
 */
export function ocr_mrz_lines(image_data: Uint8Array, width: number, height: number): any;
/**
 * Combined MRZ detection and OCR - returns parsed MRZ result
 */
export function detect_and_ocr_mrz(image_data: Uint8Array, width: number, height: number): any;
/**
 * Decode QR codes from image data (RGBA format)
 * Returns a JSON string containing an array of detected QR codes
 */
export function decode_qr_from_image(image_data: Uint8Array, width: number, height: number): any;
/**
 * Initialize the WASM module
 */
export function init(): void;
/**
 * Parse MRZ text lines to extract structured data
 */
export function parse_mrz_text(mrz_text: string): any;
export function crop_image(image_data: Uint8Array, width: number, height: number, x: number, y: number, crop_width: number, crop_height: number): Uint8Array;
export function sharpen_image(image_data: Uint8Array, width: number, height: number, amount: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly init_ocr_model: (a: number, b: number, c: number) => void;
  readonly is_ocr_model_initialized: () => number;
  readonly ocr_inference: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly ocr_inference_region: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
  readonly detect_text_regions: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly ocr_inference_batch: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly ocr_mrz_inference: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly ocr_mrz_lines: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly detect_and_ocr_mrz: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly decode_qr_from_image: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly parse_mrz_text: (a: number, b: number, c: number) => void;
  readonly crop_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
  readonly sharpen_image: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly init: () => void;
  readonly __wbindgen_export: (a: number, b: number) => number;
  readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export3: (a: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
