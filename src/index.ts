export { QRScanner } from './QRScanner';
export { QRImageScanner } from './QRImageScanner';
export { useQRScanner } from './hooks/useQRScanner';
export {
  CameraSwitchIcon,
  CameraSwitchIconSimple,
  CameraSwitchIconFlip,
  CameraSwitchIconMinimal,
} from './components/CameraSwitchIcon';
export {
  FlashSwitchIcon,
  FlashSwitchIconFlashlight,
  FlashSwitchIconMinimal,
  FlashSwitchIconWithSlash,
} from './components/FlashSwitchIcon';
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
  CameraFacing,
  SimpleFacing,
} from './types';
export { CameraFacingMode, SimpleCameraFacing } from './types';
export type { SupportedLanguage } from './constants/defaultTexts';
export type { CameraCapabilities } from './utils/camera-manager';
export { CAMERA_ERROR_CODES, CameraError, createCameraError, mapBrowserErrorToCode } from './constants/cameraErrors';
export type { CameraErrorCode } from './constants/cameraErrors';
