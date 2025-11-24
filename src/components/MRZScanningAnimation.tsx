import React from 'react';
import { getMRZAnimationStyles } from './MRZAnimationStyles';

export interface MRZScanningAnimationProps {
  isScanning: boolean;
  isDetected: boolean;
  scanningText?: string;
  detectedText?: string;
  instructionText?: string;
  color?: string;
  showScanLine?: boolean;
  showCorners?: boolean;
  showStatusText?: boolean;
  showInstruction?: boolean;
  scanLineSpeed?: number;
}

export const MRZScanningAnimation: React.FC<MRZScanningAnimationProps> = ({
  isScanning,
  isDetected,
  scanningText = 'Scanning MRZ...',
  detectedText = 'MRZ Detected!',
  instructionText = 'Position MRZ within frame',
  color = '#00ff00',
  showScanLine = true,
  showCorners = true,
  showStatusText = true,
  showInstruction = true,
  scanLineSpeed = 2,
}) => {
  return (
    <div className="mrz-animation-overlay">
      <style>{getMRZAnimationStyles(color)}</style>

      {isScanning && !isDetected && (
        <>
          {/* MRZ Document guide frame */}
          <div className="mrz-document-frame">
            {/* Document outline */}
            <div className="document-outline">
              {/* MRZ zone indicator - horizontal bars at bottom */}
              <div className="mrz-zone">
                <div className="mrz-line" />
                <div className="mrz-line" />
                <div className="mrz-line" />
              </div>

              {/* Instruction text */}
              {showInstruction && (
                <div className="mrz-instruction">
                  {instructionText}
                </div>
              )}
            </div>
          </div>

          {/* Horizontal scanning beam for MRZ */}
          {showScanLine && (
            <div
              className="mrz-scan-beam"
              style={{ '--scan-speed': `${scanLineSpeed}s` } as React.CSSProperties}
            >
              <div className="beam-glow" />
            </div>
          )}

          {/* Enhanced corner brackets */}
          {showCorners && (
            <div className="mrz-corners">
              <div className="mrz-corner top-left">
                <div className="corner-inner" />
              </div>
              <div className="mrz-corner top-right">
                <div className="corner-inner" />
              </div>
              <div className="mrz-corner bottom-left">
                <div className="corner-inner" />
              </div>
              <div className="mrz-corner bottom-right">
                <div className="corner-inner" />
              </div>
            </div>
          )}

          {/* Scanning status */}
          {showStatusText && (
            <div className="mrz-scanning-status">
              <div className="status-indicator">
                <div className="pulse-dot" />
                <div className="pulse-dot" />
                <div className="pulse-dot" />
              </div>
              <span className="status-text">{scanningText}</span>
            </div>
          )}
        </>
      )}

      {isDetected && (
        <>
          {/* Success flash overlay */}
          <div className="mrz-detection-flash" />

          {/* Document success animation */}
          <div className="mrz-success-container">
            {/* Animated document icon */}
            <div className="document-success-icon">
              <svg className="document-svg" viewBox="0 0 64 64">
                <rect className="doc-bg" x="12" y="8" width="40" height="48" rx="2" />
                <line className="doc-line" x1="18" y1="20" x2="46" y2="20" />
                <line className="doc-line" x1="18" y1="26" x2="46" y2="26" />
                <line className="doc-line" x1="18" y1="32" x2="46" y2="32" />
                {/* MRZ lines highlighted */}
                <rect className="mrz-highlight" x="18" y="42" width="28" height="3" rx="1" />
                <rect className="mrz-highlight" x="18" y="47" width="28" height="3" rx="1" />
                {/* Checkmark */}
                <circle className="check-circle" cx="32" cy="28" r="10" />
                <path className="check-path" d="M28 28l3 3 5-6" />
              </svg>
            </div>
            <div className="mrz-success-text">{detectedText}</div>
          </div>
        </>
      )}
    </div>
  );
};
