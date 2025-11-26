export { QRScanner } from './QRScanner';
export { QRImageScanner } from './QRImageScanner';
export { useQRScanner } from './hooks/useQRScanner';
export { useMRZScanner } from './hooks/useMRZScanner';
export { MRZImageScanner} from './MRZImageScanner';
export { MRZScanner } from './MRZScanner';
export {
  CameraSwitchIcon,
  CameraSwitchIconSimple,
  CameraSwitchIconFlip,
  CameraSwitchIconMinimal,
} from './components/CameraSwitchIcon';
export { initWasm, decodeQRFromImageData, drawQROverlay, configureWorker, configureWorkerFromCDN, getWorkerConfig, cleanup } from './utils/qr-processor';
export { configureWasm, configureWasmFromCDN, resetWasm, getWasmConfig } from './utils/wasm-loader';
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
export {
  getCameraDevices,
  getCameraCapabilities,
  identifyCameras,
  switchCamera,
} from './utils/camera-manager';
export {
  isSafari,
  isIOS,
  isSafariOrIOS,
  getSafariOptimizedConstraints,
} from './utils/browser-detection';
export {
  FrameBuffer,
  mergeTwoFrames,
  enhanceFrame,
  optimizeFrameForSafari,
  getRecommendedScanDelay,
  getRecommendedVideoConstraints,
  isLowEndDevice,
} from './utils/performanceOptimizer';
// OCR exports for MRZ
export {
  initOCRWasm,
  initOCRModel,
  ocrMRZInference,
  ocrMRZLines,
  drawOCROverlay,
  cleanupOCR,
} from './utils/ocr-processor';
// MRZ with OCR exports
export {
  configureOCRModel,
  initOCRModel as initMRZOCRModel,
  isOCRModelInitialized,
} from './utils/mrz-processor';
export type {
  QRCodeResult,
  QRScannerProps,
  QRImageScannerProps,
  UseQRScannerOptions,
  UseQRScannerReturn,
  AnimationText,
  AnimationConfig,
  WasmConfig,
  WorkerConfig,
  CameraDevice,
  // OCR types for MRZ
  OCRResult,
  OCRBoundingBox,
  MRZImageScannerProps,
  MRZResult,
  MRZScannerProps,
  UseMRZScannerOptions,
  UseMRZScannerReturn,
} from './types';
export type { SupportedLanguage } from './constants/defaultTexts';
export type { CameraCapabilities } from './utils/camera-manager';
export { CAMERA_ERROR_CODES, CameraError, createCameraError, mapBrowserErrorToCode } from './constants/cameraErrors';
export type { CameraErrorCode } from './constants/cameraErrors';
export type { MRZScanningAnimationProps } from './components/MRZScanningAnimation';
export type { MRZImageProcessingAnimationProps } from './components/MRZImageProcessingAnimation';

export { MRZScanningAnimation } from './components/MRZScanningAnimation';
export { MRZImageProcessingAnimation } from './components/MRZImageProcessingAnimation';
export { getMRZAnimationStyles } from './components/MRZAnimationStyles';
export { initWasm as initMRZWasm, decodeMRZFromImageData, drawMRZOverlay, formatMRZDate, validateCheckDigit, validateMRZ, cleanup as cleanupMRZ } from './utils/mrz-processor';
