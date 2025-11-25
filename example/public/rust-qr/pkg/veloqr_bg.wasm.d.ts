/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const init_ocr_model: (a: number, b: number, c: number) => void;
export const is_ocr_model_initialized: () => number;
export const ocr_inference: (a: number, b: number, c: number, d: number, e: number) => void;
export const ocr_inference_region: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
export const detect_text_regions: (a: number, b: number, c: number, d: number, e: number) => void;
export const ocr_inference_batch: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
export const ocr_mrz_inference: (a: number, b: number, c: number, d: number, e: number) => void;
export const ocr_mrz_lines: (a: number, b: number, c: number, d: number, e: number) => void;
export const detect_and_ocr_mrz: (a: number, b: number, c: number, d: number, e: number) => void;
export const decode_qr_from_image: (a: number, b: number, c: number, d: number, e: number) => void;
export const parse_mrz_text: (a: number, b: number, c: number) => void;
export const crop_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
export const sharpen_image: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
export const init: () => void;
export const __wbindgen_export: (a: number, b: number) => number;
export const __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_export3: (a: number) => void;
export const __wbindgen_add_to_stack_pointer: (a: number) => number;
export const __wbindgen_export4: (a: number, b: number, c: number) => void;
export const __wbindgen_start: () => void;
