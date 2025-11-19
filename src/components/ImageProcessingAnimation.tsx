import React from 'react';
import { getAnimationStyles } from './AnimationStyles';

export interface ImageProcessingAnimationProps {
  isProcessing: boolean;
  isSuccess: boolean;
  resultCount?: number;
  processingText?: string;
  successText?: string;
  color?: string;
  showProgressBar?: boolean;
}

export const ImageProcessingAnimation: React.FC<ImageProcessingAnimationProps> = ({
  isProcessing,
  isSuccess,
  resultCount = 0,
  processingText = 'Processing...',
  successText = 'Found {count} QR Code(s)!',
  color = '#00ff00',
  showProgressBar = true,
}) => {
  const formatSuccessText = (text: string, count: number): string => {
    return text.replace('{count}', count.toString());
  };

  return (
    <>
      <style>{getAnimationStyles(color)}</style>

      {isProcessing && (
        <div className="processing-overlay">
          <div className="spinner" />
          <div className="processing-text">
            {processingText.split('...')[0]}
            <span className="processing-dot">.</span>
            <span className="processing-dot">.</span>
            <span className="processing-dot">.</span>
          </div>
          {showProgressBar && (
            <div className="progress-bar">
              <div className="progress-fill" />
            </div>
          )}
        </div>
      )}

      {isSuccess && (
        <div className="success-overlay">
          <div className="success-icon">
            <div className="success-checkmark">✓</div>
          </div>
          <div className="success-message">
            {formatSuccessText(successText, resultCount)}
          </div>
        </div>
      )}
    </>
  );
};
