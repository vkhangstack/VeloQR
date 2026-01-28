/**
 * 60 FPS QR Scanner Demo
 *
 * This example demonstrates 60 FPS scanning with adaptive processing
 */

import { useState, useEffect } from 'react';
import { QRScanner } from '@vkhangstack/veloqr';

// Preset configurations
const PRESETS = {
  fps60Smooth: {
    name: '60 FPS - Smooth',
    description: 'Optimized for smooth 60 FPS on mobile',
    config: {
      targetFPS: 60,
      adaptiveProcessing: true,
      scanDelay: 16,
      resolutionScale: 0.8,
      preprocessingConfig: {
        enableGammaCorrection: true,
        enableAdaptiveThreshold: false,
        sharpeningSigma: 0.8,
        sharpeningAmount: 1.2,
        upscaleFilter: 'triangle',
      },
    },
  },
  fps60Quality: {
    name: '60 FPS - Quality',
    description: 'High quality with 60 FPS target',
    config: {
      targetFPS: 60,
      adaptiveProcessing: true,
      scanDelay: 16,
      resolutionScale: 1.0,
      preprocessingConfig: {
        enableGammaCorrection: true,
        enableAdaptiveThreshold: false,
        sharpeningSigma: 1.0,
        sharpeningAmount: 1.5,
        upscaleFilter: 'catmullrom',
      },
    },
  },
  fps30Quality: {
    name: '30 FPS - Maximum Quality',
    description: 'Full preprocessing, maximum detection rate',
    config: {
      targetFPS: 30,
      adaptiveProcessing: true,
      scanDelay: 33,
      resolutionScale: 1.0,
      preprocessingConfig: {
        enableGammaCorrection: true,
        enableAdaptiveThreshold: true,
        adaptiveBlockRadius: 20,
        sharpeningSigma: 1.0,
        sharpeningAmount: 2.0,
        upscaleFilter: 'lanczos3',
      },
    },
  },
  fps30Battery: {
    name: '30 FPS - Battery Saver',
    description: 'Optimized for battery life',
    config: {
      targetFPS: 30,
      adaptiveProcessing: true,
      scanDelay: 50,
      resolutionScale: 0.7,
      preprocessingConfig: {
        enableGammaCorrection: true,
        enableAdaptiveThreshold: false,
        sharpeningSigma: 0.8,
        sharpeningAmount: 1.2,
        upscaleFilter: 'triangle',
      },
    },
  },
};

export default function FPS60Demo() {
  const [selectedPreset, setSelectedPreset] = useState<string>('fps60Smooth');
  const [results, setResults] = useState<any[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [avgFPS, setAvgFPS] = useState(0);
  const [frameTimings, setFrameTimings] = useState<number[]>([]);

  // Track scan performance
  useEffect(() => {
    if (frameTimings.length > 0) {
      const sum = frameTimings.reduce((a, b) => a + b, 0);
      const avg = sum / frameTimings.length;
      setAvgFPS(Math.round(1000 / avg));
    }
  }, [frameTimings]);

  const handleScan = (qrResults: any[]) => {
    console.log('QR Codes detected:', qrResults);
    setResults(qrResults);
    setScanCount((prev) => prev + 1);

    // Track timing (simulated - would need worker stats in production)
    const now = performance.now();
    setFrameTimings((prev) => {
      const newTimings = [...prev, now];
      if (newTimings.length > 30) {
        newTimings.shift();
      }
      return newTimings;
    });
  };

  const preset = PRESETS[selectedPreset as keyof typeof PRESETS];
  const config = preset.config;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>60 FPS QR Scanner Demo</h1>
      <p>Experience smooth, real-time QR code scanning with adaptive processing</p>

      {/* Preset Selection */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Select Mode</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedPreset(key);
                setScanCount(0);
                setFrameTimings([]);
                setResults([]);
              }}
              style={{
                padding: '15px',
                background: selectedPreset === key ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                {preset.name}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Scanner */}
        <div>
          <h2>Camera View</h2>
          <div style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
            <QRScanner
              onScan={handleScan}
              {...config}
              showOverlay={true}
              showCameraSwitch={true}
              showFlashSwitch={true}
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '4/3',
                borderRadius: '8px',
              }}
            />

            {/* FPS Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '10px 15px',
                borderRadius: '5px',
                fontSize: '18px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
            >
              {avgFPS || '--'} FPS
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                Target: {config.targetFPS} FPS
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div style={{
            marginTop: '15px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
          }}>
            <h3>Performance Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '5px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                  {avgFPS || '--'}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Average FPS</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '5px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {scanCount}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Scans Completed</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '5px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                  {results.length}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>QR Codes Found</div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration & Results */}
        <div>
          <h2>Current Configuration</h2>
          <div style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>{preset.name}</strong>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                {preset.description}
              </div>
            </div>

            <div style={{ fontSize: '14px' }}>
              <div style={{ marginTop: '10px' }}>
                <span style={{ color: '#007bff' }}>●</span> Target FPS: {config.targetFPS}
              </div>
              <div>
                <span style={{ color: '#28a745' }}>●</span> Adaptive: {config.adaptiveProcessing ? 'Yes' : 'No'}
              </div>
              <div>
                <span style={{ color: '#ffc107' }}>●</span> Resolution: {(config.resolutionScale * 100).toFixed(0)}%
              </div>
              <div>
                <span style={{ color: '#dc3545' }}>●</span> Scan Delay: {config.scanDelay}ms
              </div>
            </div>

            <div style={{
              marginTop: '15px',
              padding: '10px',
              background: 'white',
              borderRadius: '5px',
              fontSize: '12px',
            }}>
              <strong>Preprocessing:</strong>
              <div>Gamma: {config.preprocessingConfig?.enableGammaCorrection ? '✓' : '✗'}</div>
              <div>Adaptive Threshold: {config.preprocessingConfig?.enableAdaptiveThreshold ? '✓' : '✗'}</div>
              <div>Sharpening: {config.preprocessingConfig?.sharpeningAmount || 1.0}x</div>
              <div>Upscale Filter: {config.preprocessingConfig?.upscaleFilter || 'default'}</div>
            </div>
          </div>

          {/* Results */}
          <h2>Detection Results</h2>
          <div style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            minHeight: '200px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}>
            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6c757d' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📱</div>
                <p>Point camera at a QR code</p>
              </div>
            ) : (
              <div>
                {results.map((result, index) => (
                  <div key={index} style={{
                    marginBottom: '10px',
                    padding: '10px',
                    background: 'white',
                    borderRadius: '5px',
                    borderLeft: '3px solid #007bff',
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      QR Code #{index + 1}
                    </div>
                    <div style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                      {result.data}
                    </div>
                    {result.version && (
                      <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '5px' }}>
                        Version: {result.version}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Testing Guide */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '12px',
      }}>
        <h3 style={{ marginTop: 0 }}>Testing Tips</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div>
            <strong>🚀 60 FPS Modes</strong>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>
              Best for smooth scanning experience. Stage 1 direct decode runs at 60 FPS,
              heavy processing only kicks in when needed.
            </p>
          </div>
          <div>
            <strong>🎯 30 FPS Quality</strong>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>
              Use for difficult conditions: small QR codes, glare, blur, or low contrast.
              Full preprocessing pipeline for maximum detection.
            </p>
          </div>
          <div>
            <strong>🔋 Battery Saver</strong>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>
              Lower resolution and scan rate for extended battery life.
              Perfect for continuous scanning scenarios.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
          <strong>Performance Expectations:</strong>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>Normal QR codes: 60 FPS (Stage 1 only, ~8ms)</li>
            <li>Medium difficulty: 40-50 FPS (Stage 2, ~15ms)</li>
            <li>Very difficult: 20-30 FPS (Stage 3, ~35ms)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
