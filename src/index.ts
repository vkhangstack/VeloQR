export { QRScanner } from './QRScanner';
export { QRImageScanner } from './QRImageScanner';
export { useQRScanner } from './hooks/useQRScanner';
export { initWasm, decodeQRFromImageData, drawQROverlay } from './utils/qr-processor';
export { configureWasm, resetWasm } from './utils/wasm-loader';
export {
  DEFAULT_TEXTS,
  DEFAULT_TEXTS_EN,
  DEFAULT_TEXTS_VI,
  DEFAULT_TEXTS_ZH,
  DEFAULT_TEXTS_JA,
  DEFAULT_TEXTS_ES,
  DEFAULT_TEXTS_FR,
  LANGUAGES,
  getTextsByLanguage,
} from './constants/defaultTexts';
export type {
  QRCodeResult,
  QRScannerProps,
  QRImageScannerProps,
  UseQRScannerOptions,
  UseQRScannerReturn,
  AnimationText,
  AnimationConfig,
  WasmConfig,
} from './types';
export type { SupportedLanguage } from './constants/defaultTexts';
