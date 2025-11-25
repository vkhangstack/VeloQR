import React, { useRef, useState } from 'react';
import { MRZImageScannerProps, MRZResult } from './types';
import { initWasm, decodeMRZFromImageData, formatMRZDate } from './utils/mrz-processor';
import { MRZImageProcessingAnimation } from './components/MRZImageProcessingAnimation';
import { DEFAULT_TEXTS, getTextsByLanguage } from './constants/defaultTexts';

export const MRZImageScanner: React.FC<MRZImageScannerProps> = ({
  onScan,
  onError,
  className = '',
  style = {},
  showPreview = true,
  acceptedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  animationText = {},
  animationConfig = {},
  language,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [result, setResult] = useState<MRZResult | null>(null);
  const wasmInitializedRef = useRef(false);

  // Get language-specific texts
  const langTexts = language ? getTextsByLanguage(language) : DEFAULT_TEXTS;

  // Merge default texts with custom texts
  const texts = {
    processing: animationText.processing || langTexts.mrz.processing,
    success: animationText.success || langTexts.mrz.success,
    stageTexts: animationText.stageTexts || langTexts.mrz.stageTexts,
    dropzoneText: langTexts.mrz.dropzoneText,
    dropzoneHint: langTexts.mrz.dropzoneHint,
  };

  // Merge default config with custom config
  const config = {
    color: animationConfig.animationColor || '#00ff00',
    showProgressBar: animationConfig.showProgressBar ?? true,
    showStageIndicator: animationConfig.showStageIndicator ?? true,
  };

  const processImage = async (file: File) => {
    if (!acceptedFormats.includes(file.type)) {
      const error = new Error(`Unsupported file type: ${file.type}`);
      onError?.(error);
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      // Initialize WASM if needed
      if (!wasmInitializedRef.current) {
        await initWasm();
        wasmInitializedRef.current = true;
      }

      // Create image element
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      setPreviewUrl(imageUrl);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Draw image to canvas
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas not available');
      }

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      ctx.drawImage(img, 0, 0);

      // Get image data and decode MRZ
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const mrzResult = await decodeMRZFromImageData(imageData);

      setResult(mrzResult);

      if (mrzResult) {
        onScan?.(mrzResult);

        // Show success animation if MRZ found
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        const error = new Error('No MRZ detected in image');
        onError?.(error);
      }

      // Clean up
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      console.error('Image processing error:', error);
      const processError = error instanceof Error ? error : new Error('Unknown error');
      onError?.(processError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '640px',
    margin: '0 auto',
    ...style,
  };

  const dropZoneStyle: React.CSSProperties = {
    border: '2px dashed #ccc',
    borderRadius: '8px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#f9f9f9',
    marginBottom: '16px',
  };

  const previewContainerStyle: React.CSSProperties = {
    position: 'relative',
    marginTop: '16px',
  };

  const previewImageStyle: React.CSSProperties = {
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
  };

  return (
    <div className={`mrz-image-scanner ${className}`} style={containerStyle}>
      <div
        style={dropZoneStyle}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('mrz-file-input')?.click()}
      >
        <p>{texts.dropzoneText}</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          {texts.dropzoneHint}
        </p>
        <input
          id="mrz-file-input"
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {result && (
        <div
          style={{
            backgroundColor: '#e8f5e9',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0' }}>MRZ Information:</h3>

          <div
            style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '4px',
              display: 'grid',
              gridTemplateColumns: '140px 1fr',
              gap: '12px',
            }}
          >
            <strong>Document Type:</strong>
            <span>{result.documentType}</span>

            <strong>Document Number:</strong>
            <span>{result.documentNumber}</span>

            <strong>Issuing Country:</strong>
            <span>{result.issuingCountry}</span>

            <strong>Nationality:</strong>
            <span>{result.nationality}</span>

            <strong>Surname:</strong>
            <span>{result.surname}</span>

            <strong>Given Names:</strong>
            <span>{result.givenNames}</span>

            <strong>Date of Birth:</strong>
            <span>{formatMRZDate(result.dateOfBirth)}</span>

            <strong>Date of Expiry:</strong>
            <span>{formatMRZDate(result.dateOfExpiry)}</span>

            <strong>Sex:</strong>
            <span>{result.sex === 'M' ? 'Male' : result.sex === 'F' ? 'Female' : 'Other'}</span>

            {result.optionalData && (
              <>
                <strong>Optional Data:</strong>
                <span>{result.optionalData}</span>
              </>
            )}

            <strong>Confidence:</strong>
            <span>{(result.confidence * 100).toFixed(0)}%</span>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '4px',
              marginTop: '12px',
              fontFamily: 'monospace',
              fontSize: '12px',
              overflowX: 'auto',
            }}
          >
            <strong>Raw MRZ:</strong>
            {result.rawMrz.map((line, index) => (
              <div key={index} style={{ marginTop: '4px' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {showPreview && previewUrl && (
        <div style={previewContainerStyle}>
          <img src={previewUrl} alt="Preview" style={previewImageStyle} />

          {/* Processing and success animations */}
          <MRZImageProcessingAnimation
            isProcessing={isProcessing}
            isSuccess={showSuccess}
            resultCount={result ? 1 : 0}
            processingText={texts.processing}
            successText={texts.success}
            stageTexts={texts.stageTexts}
            color={config.color}
            showProgressBar={config.showProgressBar}
            showStageIndicator={config.showStageIndicator}
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
