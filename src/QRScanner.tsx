import React, { useEffect, useState } from 'react';
import { QRScannerProps, ErrorMessage } from './types';
import { useQRScanner } from './hooks/useQRScanner';
import { drawQROverlay } from './utils/qr-processor';
import { ScanningAnimation } from './components/ScanningAnimation';
import { LoadingSpinner } from './components/LoadingSpinner';
import { DEFAULT_TEXTS, getTextsByLanguage } from './constants/defaultTexts';
import { CameraSwitchIcon } from './components/CameraSwitchIcon';
import { CameraError, CAMERA_ERROR_CODES } from './constants/cameraErrors';

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
  errorMessages = {},
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
  const [videoReady, setVideoReady] = useState(false);

  // Get language-specific texts
  const langTexts = language ? getTextsByLanguage(language) : DEFAULT_TEXTS;

  // Merge default texts with custom texts
  const texts = {
    scanning: animationText.scanning || langTexts.qr.scanning,
    detected: animationText.detected || langTexts.qr.detected,
    detectedCount: animationText.detectedCount || langTexts.qr.detectedCount,
    instruction: animationText.instruction || langTexts.qr.instruction,
  };

  // Merge default error messages with custom error messages
  const errors = {
    permissionDenied: errorMessages.permissionDenied || langTexts.errors.permissionDenied,
    notFound: errorMessages.notFound || langTexts.errors.notFound,
    notReadable: errorMessages.notReadable || langTexts.errors.notReadable,
    overconstrained: errorMessages.overconstrained || langTexts.errors.overconstrained,
    unknown: errorMessages.unknown || langTexts.errors.unknown,
    loading: errorMessages.loading || langTexts.errors.loading,
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
    setVideoReady(false); // Hide video during camera switch
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

  // Sync canvas dimensions with video's rendered size
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    let hasSetReady = false; // Prevent multiple setVideoReady calls

    const updateCanvasSize = () => {
      // Wait for actual video stream dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return; // Video not ready yet
      }

      // Get the actual rendered dimensions of the video element
      const rect = video.getBoundingClientRect();
      const parentRect = video.offsetParent?.getBoundingClientRect();

      // Only update if video has actual dimensions
      if (rect.width > 0 && rect.height > 0) {
        // Update canvas to match video's rendered size
        const newWidth = `${rect.width}px`;
        const newHeight = `${rect.height}px`;
        const newTop = `${rect.top - (parentRect?.top || 0)}px`;
        const newLeft = `${rect.left - (parentRect?.left || 0)}px`;

        if (canvas.style.width !== newWidth || canvas.style.height !== newHeight) {
          canvas.style.width = newWidth;
          canvas.style.height = newHeight;
          canvas.style.top = newTop;
          canvas.style.left = newLeft;
        }

        // Mark video as ready once - only call once per mount
        if (!hasSetReady && !videoReady) {
          hasSetReady = true;
          setVideoReady(true);
        }
      }
    };

    // Use 'playing' event for most reliable ready state
    const handlePlaying = () => {
      updateCanvasSize();
    };

    // Update on video metadata load
    const handleLoadedMetadata = () => {
      updateCanvasSize();
    };

    // Also use canplay event as backup
    const handleCanPlay = () => {
      updateCanvasSize();
    };

    // Debounced resize handler
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(updateCanvasSize, 100);
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Single fallback timeout - only triggers if all events fail
    const fallbackTimeout = setTimeout(() => {
      if (!hasSetReady) {
        updateCanvasSize();
      }
    }, 1000);

    return () => {
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(fallbackTimeout);
      clearTimeout(resizeTimeout);
    };
  }, [isScanning, videoReady]);

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
    height: '100%',
    maxHeight: '100%',
    margin: '0 auto',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  const videoStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    display: 'block',
    objectFit: 'cover',
    transform: 'translateZ(0)', // Force GPU acceleration
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    WebkitTransform: 'translateZ(0)',
    visibility: videoReady ? 'visible' : 'hidden',
    opacity: videoReady ? 1 : 0,
    transition: 'opacity 0.2s ease-out',
  };

  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    objectFit: 'cover',
    visibility: videoReady ? 'visible' : 'hidden',
    opacity: videoReady ? 1 : 0,
    transition: 'opacity 0.2s ease-out',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    display: showOverlay ? 'block' : 'none',
  };

  const centerFrameSize = Math.min(280, typeof window !== 'undefined' ? window.innerWidth * 0.7 : 280);

  const centerFrameStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${centerFrameSize}px`,
    height: `${centerFrameSize}px`,
    boxShadow: `0 0 0 9999px ${overlayColor}`,
    opacity: overlayOpacity,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    pointerEvents: 'none',
  };

  return (
    <>
      <style>{`
        .qr-scanner {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .qr-scanner video {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .qr-scanner canvas {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        @supports (-webkit-touch-callout: none) {
          .qr-scanner {
            height: -webkit-fill-available !important;
          }
          .qr-scanner video {
            height: -webkit-fill-available !important;
          }
        }
      `}</style>
      
      <div className={`qr-scanner ${className}`} style={containerStyle}>
        <video
          ref={videoRef}
          style={videoStyle}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} style={canvasStyle} />
        {showOverlay && videoReady && (
          <>
            <div style={overlayStyle}>
              <div style={centerFrameStyle} />
            </div>
          </>
        )}

        {/* Loading indicator */}
        {!videoReady && <LoadingSpinner text={errors.loading} />}

      {/* Scanning and detection animations */}
      {videoReady && (
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
      )}

      {error && (() => {
        const getErrorContent = (): ErrorMessage => {
          if (error instanceof CameraError) {
            switch (error.code) {
              case CAMERA_ERROR_CODES.PERMISSION_DENIED:
                return errors.permissionDenied;
              case CAMERA_ERROR_CODES.NOT_FOUND:
                return errors.notFound;
              case CAMERA_ERROR_CODES.NOT_READABLE:
                return errors.notReadable;
              case CAMERA_ERROR_CODES.OVERCONSTRAINED:
                return errors.overconstrained;
              default:
                return errors.unknown;
            }
          }
          return errors.unknown;
        };

        const errorContent = getErrorContent();

        return (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#FFEBEE',
              color: '#B71C1C',
              padding: '20px',
              borderRadius: '12px',
              fontSize: '14px',
              maxWidth: '90%',
              width: '400px',
              boxShadow: '0 4px 20px #D32F2F',
              zIndex: 100,
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {errorContent.title}
            </div>
            <div style={{ marginBottom: '12px', lineHeight: '1.5' }}>
              {errorContent.message}
            </div>
            {errorContent.instructions && errorContent.instructions.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6' }}>
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  {errorContent.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}
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
    </>
  );
};
