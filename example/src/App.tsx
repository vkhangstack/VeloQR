import { useState, useEffect } from 'react';
import { QRScanner, QRImageScanner, QRCodeResult, configureWorker } from '@vkhangstack/veloqr';
import MRZDemo from './MRZDemo';

type TabType = 'camera' | 'image' | 'mrz';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('camera');
  const [results, setResults] = useState<QRCodeResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Configure Web Worker on mount
  useEffect(() => {
    configureWorker(true, { workerUrl: '/rust-qr/pkg/worker.js' });
    console.log('Web Worker enabled for QR processing');
  }, []);

  const handleScan = (scannedResults: QRCodeResult[]) => {
    console.log('QR Codes detected:', scannedResults);
    setResults(scannedResults);
    setError(null);
  };

  const handleError = (err: Error) => {
    console.error('QR Scanner error:', err);
    setError(err.message);
  };

  return (
    <div className="app">
      <h1>VeloQR</h1>
      <p className="subtitle">
        High-performance QR code scanning powered by WebAssembly and Rust
      </p>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'camera' ? 'active' : ''}`}
          onClick={() => setActiveTab('camera')}
        >
          QR Camera
        </button>
        <button
          className={`tab ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveTab('image')}
        >
          QR Image
        </button>
        <button
          className={`tab ${activeTab === 'mrz' ? 'active' : ''}`}
          onClick={() => setActiveTab('mrz')}
        >
          MRZ Scanner
        </button>
      </div>

      <div className="scanner-container">
        {activeTab === 'mrz' ? (
          <MRZDemo />
        ) : activeTab === 'camera' ? (
          <QRScanner
            onScan={handleScan}
            onError={handleError}
            scanDelay={100}
            showOverlay={true}
            highlightColor="#667eea"
            highlightBorderWidth={4}
            animationConfig={{
              showStatusText: false
            }}
            showCameraSwitch={true}
            enableFrameMerging={false}
            optimizeForSafari={false}
          />
        ) : (
          <QRImageScanner
            onScan={handleScan}
            onError={handleError}
            showPreview={true}
          />
        )}
      </div>

      {activeTab !== 'mrz' && error && (
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

      {activeTab !== 'mrz' && results.length > 0 && (
        <div className="results">
          <h3>Detected QR Codes ({results.length})</h3>
          {results.map((result, index) => (
            <div key={index} className="result-item">
              <div className="result-label">QR Code #{index + 1}</div>
              <div className="result-data">{result.data}</div>
              <div className="result-meta">
                Version: {result.version} | Bounds: {result.bounds.length} points
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab !== 'mrz' && (
        <div style={{ marginTop: '32px', fontSize: '14px', color: '#666' }}>
          <p>
            <strong>Features:</strong>
          </p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>Real-time camera scanning</li>
            <li>Image file upload scanning</li>
            <li>Multiple QR code detection</li>
            <li>WebAssembly-powered for high performance</li>
            <li>Written in Rust for safety and speed</li>
            <li>Author: vkhangstack</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
