import React, { useRef, useState } from 'react';
import { QRImageScannerProps, QRCodeResult } from './types';
import { initWasm, decodeQRFromImageData } from './utils/qr-processor';
import { ImageProcessingAnimation } from './components/ImageProcessingAnimation';
import { DEFAULT_TEXTS, getTextsByLanguage } from './constants/defaultTexts';

export const QRImageScanner: React.FC<QRImageScannerProps> = ({
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
  const [results, setResults] = useState<QRCodeResult[]>([]);
  const wasmInitializedRef = useRef(false);

  // Get language-specific texts
  const langTexts = language ? getTextsByLanguage(language) : DEFAULT_TEXTS;

  // Merge default texts with custom texts
  const texts = {
    processing: animationText.processing || langTexts.qr.processing,
    success: animationText.success || langTexts.qr.success,
    detectedCount: animationText.detectedCount || langTexts.qr.detectedCount,
    dropzoneText: langTexts.qr.dropzoneText,
    resultLabel: langTexts.qr.resultLabel,
  };

  // Helper function to format detected count text
  const formatDetectedCount = (count: number): string => {
    const template = texts.detectedCount || 'Detected {count} QR code{plural}';
    const plural = count > 1 ? 's' : '';
    return template.replace('{count}', String(count)).replace('{plural}', plural);
  };

  // Merge default config with custom config
  const config = {
    color: animationConfig.animationColor || '#00ff00',
    showProgressBar: animationConfig.showProgressBar ?? true,
  };

  const processImage = async (file: File) => {
    if (!acceptedFormats.includes(file.type)) {
      const error = new Error(`Unsupported file type: ${file.type}`);
      onError?.(error);
      return;
    }

    setIsProcessing(true);
    setResults([]);

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

      // Get image data and decode QR codes
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrResults = await decodeQRFromImageData(imageData);

      setResults(qrResults);
      onScan?.(qrResults);

      // Show success animation if QR codes found
      if (qrResults.length > 0) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
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
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
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
    <div className={`qr-image-scanner ${className}`} style={containerStyle}>
      <div
        style={dropZoneStyle}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('qr-file-input')?.click()}
      >
        <p>{texts.dropzoneText}</p>
        <input
          id="qr-file-input"
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {results.length > 0 && (
        <div
          style={{
            backgroundColor: '#e8f5e9',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0' }}>
            {formatDetectedCount(results.length)}:
          </h3>
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'white',
                padding: '8px',
                marginTop: '8px',
                borderRadius: '4px',
                wordBreak: 'break-all',
              }}
            >
              <strong>{texts.resultLabel} {index + 1}:</strong> {result.data}
            </div>
          ))}
        </div>
      )}

      {showPreview && previewUrl && (
        <div style={previewContainerStyle}>
          <img src={previewUrl} alt="Preview" style={previewImageStyle} />

          {/* Processing and success animations */}
          <ImageProcessingAnimation
            isProcessing={isProcessing}
            isSuccess={showSuccess}
            resultCount={results.length}
            processingText={texts.processing}
            successText={texts.success}
            color={config.color}
            showProgressBar={config.showProgressBar}
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
