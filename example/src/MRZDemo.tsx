import { useState } from 'react';
import { MRZScanner, MRZImageScanner, MRZResult } from '@vkhangstack/veloqr';

type TabType = 'camera' | 'image';

function MRZDemo() {
  const [activeTab, setActiveTab] = useState<TabType>('camera');
  const [result, setResult] = useState<MRZResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = (scannedResult: MRZResult) => {
    console.log('MRZ detected:', scannedResult);
    setResult(scannedResult);
    setError(null);
  };

  const handleError = (err: Error) => {
    console.error('MRZ Scanner error:', err);
    setError(err.message);
  };

  const formatDate = (mrzDate: string): string => {
    if (mrzDate.length !== 6) return mrzDate;
    const year = mrzDate.substring(0, 2);
    const month = mrzDate.substring(2, 4);
    const day = mrzDate.substring(4, 6);
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${fullYear}-${month}-${day}`;
  };

  return (
    <div className="app">
      <h1>VeloQR - MRZ Scanner</h1>
      <p className="subtitle">
        Passport and ID card MRZ reading powered by WebAssembly and Rust
      </p>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'camera' ? 'active' : ''}`}
          onClick={() => setActiveTab('camera')}
        >
          Camera Scanner
        </button>
        <button
          className={`tab ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveTab('image')}
        >
          Image Scanner
        </button>
      </div>

      <div className="scanner-container">
        {activeTab === 'camera' ? (
          <MRZScanner
            onScan={handleScan}
            onError={handleError}
            scanDelay={500}
            showOverlay={true}
            highlightColor="#667eea"
            highlightBorderWidth={4}
            animationConfig={{
              showStatusText: false
            }}
            showCameraSwitch={true}
            
          />
        ) : (
          <MRZImageScanner
            onScan={handleScan}
            onError={handleError}
            showPreview={true}
          />
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#ffebee',
            borderRadius: '8px',
            color: '#c62828',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="results">
          <h3>MRZ Information</h3>
          <div className="result-item" style={{ textAlign: 'left' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr',
              gap: '12px',
              fontSize: '14px'
            }}>
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
              <span>{formatDate(result.dateOfBirth)}</span>

              <strong>Date of Expiry:</strong>
              <span>{formatDate(result.dateOfExpiry)}</span>

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

            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#f5f5f5',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              overflowX: 'auto'
            }}>
              <strong>Raw MRZ:</strong>
              {result.rawMrz.map((line, index) => (
                <div key={index} style={{ marginTop: '4px' }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '32px', fontSize: '14px', color: '#666' }}>
        <p>
          <strong>Supported Documents:</strong>
        </p>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li><strong>TD1:</strong> ID cards (3 lines of 30 characters)</li>
          <li><strong>TD2:</strong> Official travel documents (2 lines of 36 characters)</li>
          <li><strong>TD3:</strong> Passports (2 lines of 44 characters)</li>
        </ul>

        <p style={{ marginTop: '16px' }}>
          <strong>Features:</strong>
        </p>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li>Real-time camera scanning</li>
          <li>Image file upload scanning</li>
          <li>Automatic document type detection</li>
          <li>WebAssembly-powered OCR</li>
          <li>Written in Rust for safety and speed</li>
        </ul>
      </div>
    </div>
  );
}

export default MRZDemo;
