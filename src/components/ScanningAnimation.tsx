import React from 'react';
import { getAnimationStyles } from './AnimationStyles';

export interface ScanningAnimationProps {
  isScanning: boolean;
  isDetected: boolean;
  scanningText?: string;
  detectedText?: string;
  color?: string;
  showScanLine?: boolean;
  showCorners?: boolean;
  showStatusText?: boolean;
  scanLineSpeed?: number;
}

export const ScanningAnimation: React.FC<ScanningAnimationProps> = ({
  isScanning,
  isDetected,
  scanningText = 'Scanning QR Code...',
  detectedText = 'QR Code Detected!',
  color = '#00ff00',
  showScanLine = true,
  showCorners = true,
  showStatusText = true,
  scanLineSpeed = 2,
}) => {
  return (
    <div className="qr-animation-overlay">
      <style>{getAnimationStyles(color)}</style>

      {isScanning && !isDetected && (
        <>
          {/* Scanning line */}
          {showScanLine && (
            <div
              className="scan-line"
              style={{ '--scan-speed': `${scanLineSpeed}s` } as React.CSSProperties}
            />
          )}

          {/* Corner brackets */}
          {showCorners && (
            <div className="scanning-corners">
              <div className="corner top-left" />
              <div className="corner top-right" />
              <div className="corner bottom-left" />
              <div className="corner bottom-right" />
            </div>
          )}

          {/* Scanning text */}
          {showStatusText && (
            <div className="scanning-text">
              <div className="scanning-dot" />
              {scanningText}
            </div>
          )}
        </>
      )}

      {isDetected && (
        <>
          {/* Success flash overlay */}
          <div className="detection-overlay" />

          {/* Checkmark animation with text */}
          <div className="checkmark-container">
            <svg className="checkmark" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="24" />
              <path className="checkmark-check" d="M14 27l8 8 16-16" />
            </svg>
            <div className="success-text">{detectedText}</div>
          </div>
        </>
      )}
    </div>
  );
};
