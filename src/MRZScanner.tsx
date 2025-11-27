import React, { useEffect, useState } from 'react';
import { MRZScannerProps, ErrorMessage, CameraFacingMode, SimpleCameraFacing } from './types';
import { useMRZScanner } from './hooks/useMRZScanner';
import { drawMRZOverlay } from './utils/mrz-processor';
import { MRZScanningAnimation } from './components/MRZScanningAnimation';
import { LoadingSpinner } from './components/LoadingSpinner';
import { DEFAULT_TEXTS, getTextsByLanguage } from './constants/defaultTexts';
import { CameraSwitchIcon } from './components/CameraSwitchIcon';
import { CameraError, CAMERA_ERROR_CODES } from './constants/cameraErrors';

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
  errorMessages = {},
  showCameraSwitch = false,
  preferredCamera = CameraFacingMode.ENVIRONMENT,
  language,
}) => {
  const [showDetection, setShowDetection] = useState(false);
  const [currentFacing, setCurrentFacing] = useState<SimpleCameraFacing>(
    preferredCamera === CameraFacingMode.USER || preferredCamera === CameraFacingMode.FRONT
      ? SimpleCameraFacing.FRONT
      : SimpleCameraFacing.BACK
  );
  const [isRotating, setIsRotating] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Get language-specific texts
  const langTexts = language ? getTextsByLanguage(language) : DEFAULT_TEXTS;

  // Merge default texts with custom texts
  const texts = {
    scanning: animationText.scanning || langTexts.mrz.scanning,
    detected: animationText.detected || langTexts.mrz.detected,
    instruction: animationText.instruction || langTexts.mrz.instruction,
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
    setVideoReady(false); // Hide video during camera switch
    const newFacing = currentFacing === SimpleCameraFacing.FRONT ? SimpleCameraFacing.BACK : SimpleCameraFacing.FRONT;
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

  // MRZ frame is wider (rectangular) to match MRZ document dimensions
  const centerFrameWidth = Math.min(340, typeof window !== 'undefined' ? window.innerWidth * 0.85 : 340);
  const centerFrameHeight = Math.min(180, typeof window !== 'undefined' ? window.innerWidth * 0.45 : 180);

  const centerFrameStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${centerFrameWidth}px`,
    height: `${centerFrameHeight}px`,
    boxShadow: `0 0 0 9999px ${overlayColor}`,
    opacity: overlayOpacity,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    pointerEvents: 'none',
  };

  return (
    <>
      <style>{`
        .mrz-scanner {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .mrz-scanner video {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .mrz-scanner canvas {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        @supports (-webkit-touch-callout: none) {
          .mrz-scanner {
            height: -webkit-fill-available !important;
          }
          .mrz-scanner video {
            height: -webkit-fill-available !important;
          }
        }
      `}</style>
      <div className={`mrz-scanner ${className}`} style={containerStyle}>
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
              backgroundColor: 'rgba(220, 38, 38, 0.95)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              fontSize: '14px',
              maxWidth: '90%',
              width: '400px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              zIndex: 100,
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              {errorContent.title}
            </div>
            <div style={{ marginBottom: '12px', lineHeight: '1.5' }}>
              {errorContent.message}
            </div>
            {errorContent.instructions && errorContent.instructions.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>📌 How to fix:</div>
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
    </>
  );
};
