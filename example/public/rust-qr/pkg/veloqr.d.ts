/* tslint:disable */
/* eslint-disable */

/**
 * Apply adaptive gamma correction to enhance QR code visibility
 * Gamma value is auto-calculated if not provided based on image brightness
 */
export function apply_adaptive_gamma(image_data: Uint8Array, width: number, height: number, gamma?: number | null): Uint8Array;

/**
 * Apply adaptive thresholding to improve QR code detection in low contrast scenarios
 */
export function apply_adaptive_threshold(image_data: Uint8Array, width: number, height: number, block_radius: number): Uint8Array;

export function crop_image(image_data: Uint8Array, width: number, height: number, x: number, y: number, crop_width: number, crop_height: number): Uint8Array;

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

export function sharpen_image(image_data: Uint8Array, width: number, height: number, amount: number): Uint8Array;

/**
 * Advanced sharpening with configurable parameters to reduce noise amplification
 */
export function sharpen_image_advanced(image_data: Uint8Array, width: number, height: number, sigma: number, amount: number, threshold: number): Uint8Array;

/**
 * Advanced upscaling with multiple filter options
 * filter: 0=Nearest, 1=Triangle, 2=CatmullRom, 3=Lanczos3
 */
export function upscale_image_advanced(image_data: Uint8Array, width: number, height: number, scale_factor: number, filter: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly decode_qr_from_image: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly parse_mrz_text: (a: number, b: number, c: number) => void;
    readonly apply_adaptive_gamma: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly apply_adaptive_threshold: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly crop_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly sharpen_image: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly sharpen_image_advanced: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly upscale_image_advanced: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly init: () => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
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
