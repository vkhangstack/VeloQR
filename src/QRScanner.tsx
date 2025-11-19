import React, { useEffect, useState } from 'react';
import { QRScannerProps } from './types';
import { useQRScanner } from './hooks/useQRScanner';
import { drawQROverlay } from './utils/qr-processor';
import { ScanningAnimation } from './components/ScanningAnimation';
import { DEFAULT_TEXTS } from './constants/defaultTexts';

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  scanDelay = 500,
  videoConstraints,
  className = '',
  style = {},
  showOverlay = true,
  overlayColor = 'rgba(0, 0, 0, 0.5)',
  overlayOpacity = 0.5,
  highlightColor = '#00ff00',
  highlightBorderWidth = 3,
  animationText = {},
  animationConfig = {},
}) => {
  const [showDetection, setShowDetection] = useState(false);

  // Merge default texts with custom texts
  const texts = {
    scanning: animationText.scanning || DEFAULT_TEXTS.scanning,
    detected: animationText.detected || DEFAULT_TEXTS.detected,
    detectedCount: animationText.detectedCount || DEFAULT_TEXTS.detectedCount,
  };

  // Helper function to format detected count text
  const formatDetectedCount = (count: number): string => {
    const template = texts.detectedCount || 'Detected {count} QR code{plural}';
    const plural = count > 1 ? 's' : '';
    return template.replace('{count}', String(count)).replace('{plural}', plural);
  };

  // Merge default config with custom config
  const config = {
    showScanLine: animationConfig.showScanningLine ?? true,
    showCorners: animationConfig.showCorners ?? true,
    showStatusText: animationConfig.showStatusText ?? false,
    color: animationConfig.animationColor || highlightColor,
    scanLineSpeed: animationConfig.scanLineSpeed || 2,
    detectionDuration: animationConfig.detectionDuration || 1000,
  };

  const {
    videoRef,
    canvasRef,
    isScanning,
    startScanning,
    stopScanning,
    lastResults,
    error,
  } = useQRScanner({
    scanDelay,
    onScan,
    onError,
  });

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, []);

  // Draw overlay when results change
  useEffect(() => {
    if (canvasRef.current && lastResults.length > 0) {
      drawQROverlay(canvasRef.current, lastResults, highlightColor, highlightBorderWidth);
    }
  }, [lastResults, highlightColor, highlightBorderWidth]);

  // Show detection animation when QR code is found
  useEffect(() => {
    if (lastResults.length > 0) {
      setShowDetection(true);
      const timer = setTimeout(() => {
        setShowDetection(false);
      }, config.detectionDuration);
      return () => clearTimeout(timer);
    }
  }, [lastResults, config.detectionDuration]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '640px',
    margin: '0 auto',
    ...style,
  };

  const videoStyle: React.CSSProperties = {
    width: '100%',
    height: 'auto',
    display: 'block',
    objectFit: 'cover',
    transform: 'translateZ(0)', // Force GPU acceleration
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };

  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overlayColor,
    opacity: overlayOpacity,
    pointerEvents: 'none',
    display: showOverlay ? 'block' : 'none',
  };

  return (
    <div className={`qr-scanner ${className}`} style={containerStyle}>
      <video
        ref={videoRef}
        style={videoStyle}
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} style={canvasStyle} />
      {showOverlay && <div style={overlayStyle} />}

      {/* Scanning and detection animations */}
      <ScanningAnimation
        isScanning={isScanning}
        isDetected={showDetection}
        scanningText={texts.scanning}
        detectedText={texts.detected}
        color={config.color}
        showScanLine={config.showScanLine}
        showCorners={config.showCorners}
        showStatusText={config.showStatusText}
        scanLineSpeed={config.scanLineSpeed}
      />

      {error && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          Error: {error.message}
        </div>
      )}
      {lastResults.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 255, 0, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '14px',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formatDetectedCount(lastResults.length)}
        </div>
      )}
    </div>
  );
};
