import React, { useEffect, useState } from 'react';
import { getMRZAnimationStyles } from './MRZAnimationStyles';

export interface MRZImageProcessingAnimationProps {
  isProcessing: boolean;
  isSuccess: boolean;
  resultCount?: number;
  processingText?: string;
  successText?: string;
  stageTexts?: string[];
  color?: string;
  showProgressBar?: boolean;
  showStageIndicator?: boolean;
}

export const MRZImageProcessingAnimation: React.FC<MRZImageProcessingAnimationProps> = ({
  isProcessing,
  isSuccess,
  resultCount = 0,
  processingText = 'Analyzing Document...',
  successText = 'MRZ Successfully Read!',
  stageTexts = ['Detecting document', 'Extracting MRZ', 'Validating data'],
  color = '#00ff00',
  showProgressBar = true,
  showStageIndicator = true,
}) => {
  const [processingStage, setProcessingStage] = useState(0);
  const stages = stageTexts;

  useEffect(() => {
    if (!isProcessing) {
      setProcessingStage(0);
      return;
    }

    const interval = setInterval(() => {
      setProcessingStage((prev) => (prev + 1) % stages.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const formatSuccessText = (text: string, count: number): string => {
    return text.replace('{count}', count.toString());
  };

  return (
    <>
      <style>{getMRZAnimationStyles(color)}</style>

      {isProcessing && (
        <div className="mrz-processing-overlay">
          {/* Document scanning visualization */}
          <div className="document-processing-container">
            {/* Document icon with scan effect */}
            <div className="processing-document-icon">
              <svg className="doc-processing-svg" viewBox="0 0 64 64">
                <rect className="doc-processing-bg" x="12" y="8" width="40" height="48" rx="2" />
                <line className="doc-processing-line" x1="18" y1="20" x2="46" y2="20" />
                <line className="doc-processing-line" x1="18" y1="26" x2="46" y2="26" />
                <line className="doc-processing-line" x1="18" y1="32" x2="46" y2="32" />
                {/* MRZ area being scanned */}
                <rect className="mrz-scan-area" x="16" y="40" width="32" height="12" rx="1" />
                {/* Scanning beam */}
                <line className="scan-beam-horizontal" x1="16" y1="46" x2="48" y2="46" />
              </svg>

              {/* OCR particles effect */}
              <div className="ocr-particles">
                <div className="particle" style={{ '--delay': '0s' } as React.CSSProperties} />
                <div className="particle" style={{ '--delay': '0.3s' } as React.CSSProperties} />
                <div className="particle" style={{ '--delay': '0.6s' } as React.CSSProperties} />
                <div className="particle" style={{ '--delay': '0.9s' } as React.CSSProperties} />
              </div>
            </div>

            {/* Processing stage indicator */}
            {showStageIndicator && (
              <div className="processing-stage">
                <div className="stage-text">{stages[processingStage]}</div>
                <div className="stage-dots">
                  {stages.map((_, index) => (
                    <div
                      key={index}
                      className={`stage-dot ${index === processingStage ? 'active' : ''} ${index < processingStage ? 'completed' : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Animated processing text */}
            <div className="mrz-processing-text">
              {processingText.split('...')[0]}
              <span className="processing-dot-anim">.</span>
              <span className="processing-dot-anim">.</span>
              <span className="processing-dot-anim">.</span>
            </div>

            {/* Progress bar with data extraction visualization */}
            {showProgressBar && (
              <div className="mrz-progress-container">
                <div className="mrz-progress-bar">
                  <div className="mrz-progress-fill" />
                  <div className="data-extraction-particles" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="mrz-success-overlay">
          {/* Success document animation */}
          <div className="mrz-success-icon-container">
            <div className="success-document-icon">
              <svg className="doc-success-svg" viewBox="0 0 64 64">
                <rect className="doc-success-bg" x="12" y="8" width="40" height="48" rx="2" />
                <line className="doc-success-line" x1="18" y1="20" x2="46" y2="20" />
                <line className="doc-success-line" x1="18" y1="26" x2="46" y2="26" />
                <line className="doc-success-line" x1="18" y1="32" x2="46" y2="32" />
                {/* Highlighted MRZ area */}
                <rect className="mrz-success-highlight" x="18" y="42" width="28" height="3" rx="1" />
                <rect className="mrz-success-highlight" x="18" y="47" width="28" height="3" rx="1" />
              </svg>

              {/* Large checkmark overlay */}
              <div className="large-checkmark">
                <svg viewBox="0 0 52 52">
                  <circle className="checkmark-circle-success" cx="26" cy="26" r="24" />
                  <path className="checkmark-check-success" d="M14 27l8 8 16-16" />
                </svg>
              </div>
            </div>

            {/* Success particles burst */}
            <div className="success-particles">
              <div className="success-particle" style={{ '--angle': '0deg' } as React.CSSProperties} />
              <div className="success-particle" style={{ '--angle': '60deg' } as React.CSSProperties} />
              <div className="success-particle" style={{ '--angle': '120deg' } as React.CSSProperties} />
              <div className="success-particle" style={{ '--angle': '180deg' } as React.CSSProperties} />
              <div className="success-particle" style={{ '--angle': '240deg' } as React.CSSProperties} />
              <div className="success-particle" style={{ '--angle': '300deg' } as React.CSSProperties} />
            </div>
          </div>

          <div className="mrz-success-message">
            <div className="success-badge">
              <span className="badge-icon">🎉</span>
              {formatSuccessText(successText, resultCount)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
