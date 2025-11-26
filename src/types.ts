export interface QRCodeResult {
  data: string;
  version: number;
  bounds: [number, number][];
}

export interface WasmConfig {
  wasmUrl?: string;
  wasmJsUrl?: string;
  version?: string; // Package version for CDN loading (e.g., '1.0.1', 'latest')
}

export interface WorkerConfig {
  workerUrl?: string; // Full URL to the worker.js file
  version?: string; // Package version for CDN loading (e.g., '1.0.1', 'latest')
}

export interface AnimationText {
  scanning?: string;
  detected?: string;
  processing?: string;
  success?: string;
  detectedCount?: string; // Template for "Detected X QR code(s)" - use {count} as placeholder
  instruction?: string; // Instruction text for MRZ scanning (e.g., "Position MRZ within frame")
  stageTexts?: string[]; // Custom stage texts for MRZ processing (e.g., ["Detecting...", "Extracting...", "Validating..."])
}

export interface ErrorMessage {
  title: string;
  message: string;
  instructions?: string[];
}

export interface ErrorMessages {
  permissionDenied?: ErrorMessage;
  notFound?: ErrorMessage;
  notReadable?: ErrorMessage;
  overconstrained?: ErrorMessage;
  unknown?: ErrorMessage;
  loading?: string;
}

export interface AnimationConfig {
  showScanningLine?: boolean;
  showCorners?: boolean;
  showStatusText?: boolean;
  animationColor?: string;
  scanLineSpeed?: number;
  detectionDuration?: number;
  showInstruction?: boolean; // Show instruction text for MRZ scanning
  showStageIndicator?: boolean; // Show stage indicator for MRZ processing
  showProgressBar?: boolean; // Show progress bar for processing
}

export interface QRScannerProps {
  onScan?: (results: QRCodeResult[]) => void;
  onError?: (error: Error) => void;
  scanDelay?: number;
  videoConstraints?: MediaTrackConstraints;
  className?: string;
  style?: React.CSSProperties;
  showOverlay?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  highlightColor?: string;
  highlightBorderWidth?: number;
  animationText?: AnimationText;
  animationConfig?: AnimationConfig;
  errorMessages?: ErrorMessages; // Custom error messages
  enableFrameMerging?: boolean; // Enable temporal frame averaging
  optimizeForSafari?: boolean; // Apply Safari-specific optimizations
  showCameraSwitch?: boolean; // Show camera switch button
  preferredCamera?: 'front' | 'back' | 'environment' | 'user';
  language?: 'en' | 'vi' | 'zh' | 'ja' | 'es' | 'fr'; // Default language for texts
  crop?: {
    x: number; // Crop area for scanning (in pixels)
    y: number; // Crop area for scanning (in pixels)
    width: number; // Crop area for scanning (in pixels)
    height: number; // Crop area for scanning (in pixels)
  };
  sharpen?: number; // Sharpening level for image processing (0 = none, higher = more sharpen)
  vibrate?: boolean; // Vibrate when QR code is detected  
}

export interface QRImageScannerProps {
  onScan?: (results: QRCodeResult[]) => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
  showPreview?: boolean;
  acceptedFormats?: string[];
  animationText?: AnimationText;
  animationConfig?: AnimationConfig;
  language?: 'en' | 'vi' | 'zh' | 'ja' | 'es' | 'fr'; // Default language for texts
  vibrate?: boolean; // Vibrate when QR code is detected  
}

export interface UseQRScannerOptions {
  scanDelay?: number;
  onScan?: (results: QRCodeResult[]) => void;
  onError?: (error: Error) => void;
  videoConstraints?: MediaTrackConstraints;
  enableFrameMerging?: boolean; // Enable temporal frame averaging for better accuracy
  frameMergeCount?: number; // Number of frames to merge (default: 3)
  optimizeForSafari?: boolean; // Apply Safari-specific optimizations (default: auto-detect)
  preferredCamera?: 'front' | 'back' | 'environment' | 'user'; // Preferred camera
  resolutionScale?: number; // Scale factor for processing resolution (0.5 = half res, 1 = full res, default: 1)
  crop?: {
    x: number; // Crop area for scanning (in pixels)
    y: number; // Crop area for scanning (in pixels)
    width: number; // Crop area for scanning (in pixels)
    height: number; // Crop area for scanning (in pixels)
  };
  sharpen?: number; // Sharpening level for image processing (0 = none, higher = more sharpen)
  vibrate?: boolean; // Vibrate when QR code is detected  
}

export interface UseQRScannerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isScanning: boolean;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  switchCamera: (facingMode?: 'front' | 'back' | 'environment' | 'user') => Promise<void>;
  availableCameras: CameraDevice[];
  currentCamera: CameraDevice | null;
  lastResults: QRCodeResult[];
  error: Error | null;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
  groupId?: string;
}

// ==================== MRZ Types ====================

export interface MRZResult {
  documentType: string; // TD1, TD2, or TD3
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  nationality: string;
  sex: string;
  surname: string;
  givenNames: string;
  optionalData: string;
  issuingCountry: string;
  rawMrz: string[];
  confidence: number;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MRZScannerProps {
  onScan?: (result: MRZResult) => void;
  onError?: (error: Error) => void;
  scanDelay?: number;
  videoConstraints?: MediaTrackConstraints;
  className?: string;
  style?: React.CSSProperties;
  showOverlay?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  highlightColor?: string;
  highlightBorderWidth?: number;
  animationText?: AnimationText;
  animationConfig?: AnimationConfig;
  errorMessages?: ErrorMessages; // Custom error messages
  showCameraSwitch?: boolean;
  preferredCamera?: 'front' | 'back' | 'environment' | 'user';
  language?: 'en' | 'vi' | 'zh' | 'ja' | 'es' | 'fr'; // Default language for texts
}

export interface MRZImageScannerProps {
  onScan?: (result: MRZResult) => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
  showPreview?: boolean;
  acceptedFormats?: string[];
  animationText?: AnimationText;
  animationConfig?: AnimationConfig;
  language?: 'en' | 'vi' | 'zh' | 'ja' | 'es' | 'fr'; // Default language for texts
}

export interface UseMRZScannerOptions {
  scanDelay?: number;
  onScan?: (result: MRZResult) => void;
  onError?: (error: Error) => void;
  videoConstraints?: MediaTrackConstraints;
  preferredCamera?: 'front' | 'back' | 'environment' | 'user';
}

export interface UseMRZScannerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isScanning: boolean;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  switchCamera: (facingMode?: 'front' | 'back' | 'environment' | 'user') => Promise<void>;
  availableCameras: CameraDevice[];
  currentCamera: CameraDevice | null;
  lastResult: MRZResult | null;
  error: Error | null;
}
