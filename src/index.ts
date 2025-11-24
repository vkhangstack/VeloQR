export { QRScanner } from './QRScanner';
export { QRImageScanner } from './QRImageScanner';
export { useQRScanner } from './hooks/useQRScanner';
export { MRZScanner } from './MRZScanner';
export { MRZImageScanner } from './MRZImageScanner';
export { useMRZScanner } from './hooks/useMRZScanner';
export {
  CameraSwitchIcon,
  CameraSwitchIconSimple,
  CameraSwitchIconFlip,
  CameraSwitchIconMinimal,
} from './components/CameraSwitchIcon';
export { MRZScanningAnimation } from './components/MRZScanningAnimation';
export { MRZImageProcessingAnimation } from './components/MRZImageProcessingAnimation';
export { getMRZAnimationStyles } from './components/MRZAnimationStyles';
export { initWasm, decodeQRFromImageData, drawQROverlay, configureWorker, configureWorkerFromCDN, getWorkerConfig, cleanup } from './utils/qr-processor';
export { initWasm as initMRZWasm, decodeMRZFromImageData, drawMRZOverlay, formatMRZDate, validateCheckDigit, validateMRZ, cleanup as cleanupMRZ } from './utils/mrz-processor';
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
export type {
  QRCodeResult,
  QRScannerProps,
  QRImageScannerProps,
  UseQRScannerOptions,
  UseQRScannerReturn,
  MRZResult,
  MRZScannerProps,
  MRZImageScannerProps,
  UseMRZScannerOptions,
  UseMRZScannerReturn,
  AnimationText,
  AnimationConfig,
  WasmConfig,
  WorkerConfig,
  CameraDevice,
} from './types';
export type { SupportedLanguage } from './constants/defaultTexts';
export type { CameraCapabilities } from './utils/camera-manager';
export type { MRZScanningAnimationProps } from './components/MRZScanningAnimation';
export type { MRZImageProcessingAnimationProps } from './components/MRZImageProcessingAnimation';
