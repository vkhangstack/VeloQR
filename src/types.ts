export interface QRCodeResult {
  data: string;
  version: number;
  bounds: [number, number][];
}

export interface WasmConfig {
  wasmUrl?: string;
  wasmJsUrl?: string;
}

export interface AnimationText {
  scanning?: string;
  detected?: string;
  processing?: string;
  success?: string;
  detectedCount?: string; // Template for "Detected X QR code(s)" - use {count} as placeholder
}

export interface AnimationConfig {
  showScanningLine?: boolean;
  showCorners?: boolean;
  showStatusText?: boolean;
  animationColor?: string;
  scanLineSpeed?: number;
  detectionDuration?: number;
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
  enableFrameMerging?: boolean; // Enable temporal frame averaging
  optimizeForSafari?: boolean; // Apply Safari-specific optimizations
  showCameraSwitch?: boolean; // Show camera switch button
  preferredCamera?: 'front' | 'back' | 'environment' | 'user';
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
