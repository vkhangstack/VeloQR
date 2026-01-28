/**
 * Preprocessing Demo
 *
 * This example demonstrates the new preprocessing features for difficult QR code detection
 */

import { useState } from 'react';
import { QRScanner, PreprocessingConfig } from '@vkhangstack/veloqr';

// Preset configurations
const PRESETS: Record<string, PreprocessingConfig> = {
  default: {
    enableGammaCorrection: true,
    enableAdaptiveThreshold: true,
    adaptiveBlockRadius: 20,
    sharpeningSigma: 1.0,
    sharpeningAmount: 1.5,
    upscaleFilter: 'catmullrom',
  },
  highQuality: {
    enableGammaCorrection: true,
    enableAdaptiveThreshold: true,
    adaptiveBlockRadius: 20,
    sharpeningSigma: 1.0,
    sharpeningAmount: 2.0,
    sharpeningThreshold: 3,
    upscaleFilter: 'lanczos3',
  },
  performance: {
    enableGammaCorrection: true,
    enableAdaptiveThreshold: false,
    sharpeningSigma: 0.8,
    sharpeningAmount: 1.2,
    upscaleFilter: 'triangle',
  },
  glare: {
    enableGammaCorrection: true,
    gamma: 0.7,
    enableAdaptiveThreshold: true,
    adaptiveBlockRadius: 25,
    sharpeningAmount: 1.8,
  },
  smallQR: {
    enableGammaCorrection: true,
    sharpeningSigma: 0.8,
    sharpeningAmount: 2.0,
    upscaleFilter: 'lanczos3',
  },
  lowContrast: {
    enableGammaCorrection: true,
    enableAdaptiveThreshold: true,
    adaptiveBlockRadius: 20,
    sharpeningAmount: 2.5,
  },
};

export default function PreprocessingDemo() {
  const [selectedPreset, setSelectedPreset] = useState<string>('default');
  const [customConfig, setCustomConfig] = useState<PreprocessingConfig>(PRESETS.default);
  const [results, setResults] = useState<any[]>([]);
  const [useCustom, setUseCustom] = useState(false);

  const handleScan = (qrResults: any[]) => {
    console.log('QR Codes detected:', qrResults);
    setResults(qrResults);
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setCustomConfig(PRESETS[preset]);
    setUseCustom(false);
  };

  const handleCustomToggle = () => {
    setUseCustom(!useCustom);
  };

  const config = useCustom ? customConfig : PRESETS[selectedPreset];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>QR Code Preprocessing Demo</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Select Preset</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.keys(PRESETS).map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetChange(preset)}
              style={{
                padding: '10px 20px',
                background: selectedPreset === preset && !useCustom ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              {preset}
            </button>
          ))}
          <button
            onClick={handleCustomToggle}
            style={{
              padding: '10px 20px',
              background: useCustom ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Custom
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Scanner */}
        <div>
          <h2>Camera View</h2>
          <div style={{ position: 'relative', width: '100%', maxWidth: '640px' }}>
            <QRScanner
              onScan={handleScan}
              scanDelay={300}
              showOverlay={true}
              showCameraSwitch={true}
              showFlashSwitch={true}
              preprocessingConfig={config}
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '4/3',
              }}
            />
          </div>
        </div>

        {/* Configuration Panel */}
        <div>
          <h2>Configuration</h2>
          <div style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '5px',
            maxHeight: '600px',
            overflowY: 'auto',
          }}>
            <h3>Active Preset: {useCustom ? 'Custom' : selectedPreset}</h3>

            <div style={{ marginTop: '15px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={config.enableGammaCorrection || false}
                  onChange={(e) => setCustomConfig({ ...customConfig, enableGammaCorrection: e.target.checked })}
                  disabled={!useCustom}
                />
                {' '}Enable Gamma Correction
              </label>
            </div>

            {config.enableGammaCorrection && (
              <div style={{ marginLeft: '20px', marginTop: '10px' }}>
                <label>
                  Gamma: {config.gamma || 'auto'}
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={config.gamma || 1.0}
                    onChange={(e) => setCustomConfig({ ...customConfig, gamma: parseFloat(e.target.value) })}
                    disabled={!useCustom}
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
            )}

            <div style={{ marginTop: '15px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={config.enableAdaptiveThreshold || false}
                  onChange={(e) => setCustomConfig({ ...customConfig, enableAdaptiveThreshold: e.target.checked })}
                  disabled={!useCustom}
                />
                {' '}Enable Adaptive Threshold
              </label>
            </div>

            {config.enableAdaptiveThreshold && (
              <div style={{ marginLeft: '20px', marginTop: '10px' }}>
                <label>
                  Block Radius: {config.adaptiveBlockRadius || 20}
                  <input
                    type="range"
                    min="10"
                    max="30"
                    step="5"
                    value={config.adaptiveBlockRadius || 20}
                    onChange={(e) => setCustomConfig({ ...customConfig, adaptiveBlockRadius: parseInt(e.target.value) })}
                    disabled={!useCustom}
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
            )}

            <div style={{ marginTop: '15px' }}>
              <h4>Sharpening</h4>
              <label>
                Sigma: {config.sharpeningSigma || 1.0}
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.sharpeningSigma || 1.0}
                  onChange={(e) => setCustomConfig({ ...customConfig, sharpeningSigma: parseFloat(e.target.value) })}
                  disabled={!useCustom}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Amount: {config.sharpeningAmount || 1.5}
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={config.sharpeningAmount || 1.5}
                  onChange={(e) => setCustomConfig({ ...customConfig, sharpeningAmount: parseFloat(e.target.value) })}
                  disabled={!useCustom}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Threshold: {config.sharpeningThreshold || 5}
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={config.sharpeningThreshold || 5}
                  onChange={(e) => setCustomConfig({ ...customConfig, sharpeningThreshold: parseInt(e.target.value) })}
                  disabled={!useCustom}
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            <div style={{ marginTop: '15px' }}>
              <h4>Upscaling Filter</h4>
              <select
                value={config.upscaleFilter || 'catmullrom'}
                onChange={(e) => setCustomConfig({ ...customConfig, upscaleFilter: e.target.value as any })}
                disabled={!useCustom}
                style={{ width: '100%', padding: '5px' }}
              >
                <option value="nearest">Nearest (Fastest)</option>
                <option value="triangle">Triangle (Fast)</option>
                <option value="catmullrom">CatmullRom (Balanced)</option>
                <option value="lanczos3">Lanczos3 (Best Quality)</option>
              </select>
            </div>

            <div style={{ marginTop: '20px', padding: '10px', background: 'white', borderRadius: '5px' }}>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ marginTop: '20px' }}>
        <h2>Detection Results</h2>
        <div style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '5px',
          minHeight: '100px',
        }}>
          {results.length === 0 ? (
            <p>No QR codes detected yet...</p>
          ) : (
            <div>
              <p><strong>Detected {results.length} QR code(s):</strong></p>
              {results.map((result, index) => (
                <div key={index} style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: 'white',
                  borderRadius: '5px',
                  borderLeft: '3px solid #007bff',
                }}>
                  <p><strong>Data:</strong> {result.data}</p>
                  <p><strong>Version:</strong> {result.version}</p>
                  {result.bounds && (
                    <p><strong>Bounds:</strong> {result.bounds.length} points</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '5px' }}>
        <h3>Testing Instructions</h3>
        <ol>
          <li><strong>Glare:</strong> Point camera at QR code near bright light or window</li>
          <li><strong>Small QR:</strong> Move camera far from QR code (1-2 meters)</li>
          <li><strong>Blur:</strong> Slightly move camera while scanning or out-of-focus</li>
          <li><strong>Low Contrast:</strong> Use faded, photocopied, or old printed QR codes</li>
        </ol>
        <p><strong>Tip:</strong> Try different presets for different conditions, or use Custom mode to fine-tune parameters.</p>
      </div>
    </div>
  );
}
