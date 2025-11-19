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
}

export interface UseQRScannerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isScanning: boolean;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  lastResults: QRCodeResult[];
  error: Error | null;
}
