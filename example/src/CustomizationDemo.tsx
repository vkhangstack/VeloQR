import React, { useState } from 'react';
import {
  QRScanner,
  QRImageScanner,
  QRCodeResult,
  getTextsByLanguage,
  SupportedLanguage,
  DEFAULT_TEXTS_EN,
} from 'veloqr';

export const CustomizationDemo: React.FC = () => {
  const [language, setLanguage] = useState<SupportedLanguage>('vi');
  const [color, setColor] = useState('#00ff00');
  const [scanSpeed, setScanSpeed] = useState(2);
  const [showScanLine, setShowScanLine] = useState(true);
  const [showCorners, setShowCorners] = useState(true);
  const [showText, setShowText] = useState(true);
  const [results, setResults] = useState<QRCodeResult[]>([]);

  const handleScan = (scannedResults: QRCodeResult[]) => {
    console.log('Scanned:', scannedResults);
    setResults(scannedResults);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Animation Customization Demo</h1>

      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Settings</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Language:
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            style={{ padding: '8px', fontSize: '14px', width: '100%' }}
          >
            <option value="en">English</option>
            <option value="vi">Vietnamese (Tiếng Việt)</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Animation Color:
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '60px', height: '40px' }}
            />
            <span style={{ fontFamily: 'monospace' }}>{color}</span>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Scan Line Speed: {scanSpeed}s
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={scanSpeed}
            onChange={(e) => setScanSpeed(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showScanLine}
              onChange={(e) => setShowScanLine(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Show Scan Line
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCorners}
              onChange={(e) => setShowCorners(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Show Corner Brackets
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showText}
              onChange={(e) => setShowText(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Show Status Text
          </label>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3>Camera Scanner</h3>
        <QRScanner
          onScan={handleScan}
          animationText={getTextsByLanguage(language)}
          animationConfig={{
            showScanningLine: showScanLine,
            showCorners: showCorners,
            showStatusText: showText,
            animationColor: color,
            scanLineSpeed: scanSpeed,
            detectionDuration: 1500,
          }}
          highlightColor={color}
        />
      </div>

      <div style={{ marginTop: '20px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3>Image Scanner</h3>
        <QRImageScanner
          onScan={handleScan}
          animationText={getTextsByLanguage(language)}
          animationConfig={{
            animationColor: color,
          }}
        />
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: '20px', background: '#e8f5e9', padding: '20px', borderRadius: '8px' }}>
          <h3>Last Results ({results.length})</h3>
          {results.map((result, idx) => (
            <div
              key={idx}
              style={{
                background: 'white',
                padding: '12px',
                marginTop: '10px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              <strong>QR {idx + 1}:</strong> {result.data}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Code Example</h3>
        <pre style={{ background: '#2d2d2d', color: '#f8f8f2', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`import { QRScanner, getTextsByLanguage } from 'veloqr';

<QRScanner
  onScan={(results) => console.log(results)}
  animationText={getTextsByLanguage('${language}')}
  animationConfig={{
    showScanningLine: ${showScanLine},
    showCorners: ${showCorners},
    showStatusText: ${showText},
    animationColor: '${color}',
    scanLineSpeed: ${scanSpeed},
  }}
  highlightColor="${color}"
/>`}
        </pre>
      </div>
    </div>
  );
};
