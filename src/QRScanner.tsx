import React, { useEffect, useState } from 'react';
import { QRScannerProps } from './types';
import { useQRScanner } from './hooks/useQRScanner';
import { drawQROverlay } from './utils/qr-processor';
import { ScanningAnimation } from './components/ScanningAnimation';
import { DEFAULT_TEXTS, getTextsByLanguage } from './constants/defaultTexts';
import { CameraSwitchIcon } from './components/CameraSwitchIcon';

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
  enableFrameMerging = false,
  optimizeForSafari,
  showCameraSwitch = false,
  preferredCamera = 'environment',
  language,
  crop,
  sharpen,
}) => {
  const [showDetection, setShowDetection] = useState(false);
  const [currentFacing, setCurrentFacing] = useState<'front' | 'back'>(
    preferredCamera === 'user' || preferredCamera === 'front' ? 'front' : 'back'
  );
  const [isRotating, setIsRotating] = useState(false);

  // Get language-specific texts
  const langTexts = language ? getTextsByLanguage(language) : DEFAULT_TEXTS;

  // Merge default texts with custom texts
  const texts = {
    scanning: animationText.scanning || langTexts.qr.scanning,
    detected: animationText.detected || langTexts.qr.detected,
    detectedCount: animationText.detectedCount || langTexts.qr.detectedCount,
    instruction: animationText.instruction || langTexts.qr.instruction,
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
    showInstruction: animationConfig.showInstruction ?? false,
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
    switchCamera,
    availableCameras,
    currentCamera,
    lastResults,
    error,
  } = useQRScanner({
    scanDelay,
    onScan,
    onError,
    videoConstraints,
    enableFrameMerging,
    optimizeForSafari,
    preferredCamera,
    crop,
    sharpen,
  });

  const handleCameraSwitch = async () => {
    if (isRotating) return; // Prevent multiple clicks during animation

    setIsRotating(true);
    const newFacing = currentFacing === 'front' ? 'back' : 'front';
    setCurrentFacing(newFacing);
    await switchCamera(newFacing);

    // Reset animation state after animation completes
    setTimeout(() => {
      setIsRotating(false);
    }, 600); // Match the CSS animation duration
  };

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
    maxWidth: '100%',
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

      {/* Camera Switch Button */}
      {showCameraSwitch && availableCameras.length > 1 && (
        <button
          onClick={handleCameraSwitch}
          disabled={isRotating}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isRotating ? 'not-allowed' : 'pointer',
            fontSize: '24px',
            zIndex: 10,
            transition: 'all 0.3s ease',
            opacity: isRotating ? 0.7 : 1,
          }}
          title={`Switch to ${currentFacing === 'front' ? 'back' : 'front'} camera`}
        >
          <div
            style={{
              transform: isRotating ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.6s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CameraSwitchIcon size={28} color="white" />
          </div>
        </button>
      )}
    </div>
  );
};
