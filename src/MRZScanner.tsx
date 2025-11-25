import React, { useEffect, useState } from 'react';
import { MRZScannerProps } from './types';
import { useMRZScanner } from './hooks/useMRZScanner';
import { drawMRZOverlay } from './utils/mrz-processor';
import { MRZScanningAnimation } from './components/MRZScanningAnimation';
import { DEFAULT_TEXTS, getTextsByLanguage } from './constants/defaultTexts';
import { CameraSwitchIcon } from './components/CameraSwitchIcon';

export const MRZScanner: React.FC<MRZScannerProps> = ({
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
  showCameraSwitch = false,
  preferredCamera = 'environment',
  language,
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
    scanning: animationText.scanning || langTexts.mrz.scanning,
    detected: animationText.detected || langTexts.mrz.detected,
    instruction: animationText.instruction || langTexts.mrz.instruction,
  };

  // Merge default config with custom config
  const config = {
    showScanLine: animationConfig.showScanningLine ?? true,
    showCorners: animationConfig.showCorners ?? true,
    showStatusText: animationConfig.showStatusText ?? false,
    showInstruction: animationConfig.showInstruction ?? true,
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
    lastResult,
    error,
  } = useMRZScanner({
    scanDelay,
    onScan,
    onError,
    videoConstraints,
    preferredCamera,
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

  // Clear overlay when result changes (canvas is cropped, overlay not needed)
  useEffect(() => {
    if (canvasRef.current && lastResult) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [lastResult]);

  // Show detection animation when MRZ is found
  useEffect(() => {
    if (lastResult) {
      setShowDetection(true);
      const timer = setTimeout(() => {
        setShowDetection(false);
      }, config.detectionDuration);
      return () => clearTimeout(timer);
    }
  }, [lastResult, config.detectionDuration]);

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
    <div className={`mrz-scanner ${className}`} style={containerStyle}>
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
      <MRZScanningAnimation
        isScanning={isScanning}
        isDetected={showDetection}
        scanningText={texts.scanning}
        detectedText={texts.detected}
        instructionText={texts.instruction}
        color={config.color}
        showScanLine={config.showScanLine}
        showCorners={config.showCorners}
        showStatusText={config.showStatusText}
        showInstruction={config.showInstruction}
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
      {lastResult && (
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
          {lastResult.documentType}: {lastResult.surname}, {lastResult.givenNames}
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
