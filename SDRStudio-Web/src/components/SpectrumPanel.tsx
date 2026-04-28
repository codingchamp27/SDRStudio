import React, { useEffect, useRef, useState } from 'react';
import { Radio, AlertTriangle } from 'lucide-react';

interface SpectrumPanelProps {
  connected: boolean;
}

export const SpectrumPanel: React.FC<SpectrumPanelProps> = ({ connected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const waterfallRef = useRef<ImageData | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');

  useEffect(() => {
    if (!connected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setStatus('connecting');

    // SDRangel WSSpectrum server listens on port 8887 (not the REST API port 8091)
    // Frame layout: [0] uint64 centerFreq, [8] int64 fftTimeMs, [16] uint64 timestampMs,
    //               [24] int fftSize, [28] int bandwidth, [32] int indicators, [36] float[] spectrum
    const HEADER = 36;
    const ws = new WebSocket('ws://127.0.0.1:8887');
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => setStatus('active');
    ws.onerror = () => setStatus('error');
    ws.onclose = () => {
      if (status !== 'error') setStatus('idle');
    };

    ws.onmessage = (e) => {
      if (!(e.data instanceof ArrayBuffer)) return;
      const buf = e.data as ArrayBuffer;
      if (buf.byteLength < HEADER) return;
      const view = new DataView(buf);
      const fftSize = view.getInt32(24, true);
      if (fftSize <= 0 || buf.byteLength < HEADER + fftSize * 4) return;
      const spectrum = new Float32Array(buf, HEADER, fftSize);

      const W = canvas.width;
      const H = canvas.height;

      // Scroll waterfall down by 1 row
      if (!waterfallRef.current || waterfallRef.current.width !== W) {
        waterfallRef.current = ctx.createImageData(W, H);
      }
      const imgData = waterfallRef.current;
      // shift rows down
      imgData.data.copyWithin(W * 4, 0, W * (H - 1) * 4);

      // Draw new row at top from spectrum data
      const numBins = fftSize;
      const minDb = -120, maxDb = 0;
      for (let x = 0; x < W; x++) {
        const binIdx = Math.floor((x / W) * numBins);
        const val = spectrum[binIdx] ?? -120;
        const norm = Math.max(0, Math.min(1, (val - minDb) / (maxDb - minDb)));

        let r = 0, g = 0, b = 0;
        if (norm < 0.25) { const t = norm / 0.25; r = 0; g = 0; b = Math.round(t * 255); }
        else if (norm < 0.5) { const t = (norm - 0.25) / 0.25; r = 0; g = Math.round(t * 255); b = 255; }
        else if (norm < 0.75) { const t = (norm - 0.5) / 0.25; r = Math.round(t * 255); g = 255; b = Math.round((1-t)*255); }
        else { const t = (norm - 0.75) / 0.25; r = 255; g = Math.round((1-t)*255); b = 0; }

        const i = x * 4;
        imgData.data[i] = r; imgData.data[i+1] = g; imgData.data[i+2] = b; imgData.data[i+3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    };

    return () => { ws.close(); };
  }, [connected]);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', animation: 'fadeInUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Spectrum</h1>
          <p style={{ fontSize: 13, color: '#4a5a7a', marginTop: 4 }}>Live FFT waterfall from SDRangel WebSocket</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status === 'active' && (
            <span className="badge badge-online"><span style={{width:6,height:6,borderRadius:'50%',background:'#00ff88', animation:'pulse 2s ease-in-out infinite', display:'inline-block'}}/> Live</span>
          )}
          {status === 'connecting' && <span className="badge badge-warning"><span className="spinner" style={{width:10,height:10}}/> Connecting</span>}
          {status === 'error' && <span className="badge badge-offline">No Signal</span>}
          {status === 'idle' && <span className="badge" style={{color:'#4a5a7a', border:'1px solid rgba(255,255,255,0.1)'}}>Idle</span>}
        </div>
      </div>

      <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative', minHeight: 300 }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'rgba(7,11,20,0.7)', backdropFilter: 'blur(4px)',
          }}>
            <AlertTriangle size={36} color="#ffaa00" />
            <p style={{ fontSize: 13, color: '#8899bb', textAlign: 'center', maxWidth: 280 }}>
              Could not connect to spectrum WebSocket.<br />
              Make sure a device set is running and spectrum server is enabled in SDRangel.
            </p>
          </div>
        )}
        {(status === 'idle' || !connected) && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <Radio size={40} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: 13, color: '#4a5a7a' }}>
              {connected ? 'Start a device to see spectrum data' : 'Connect to SDRangel to view spectrum'}
            </p>
          </div>
        )}
      </div>

      {/* Color scale legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#4a5a7a' }}>−120 dB</span>
        <div style={{
          flex: 1, height: 8, borderRadius: 4,
          background: 'linear-gradient(to right, #000033, #0000ff, #00ffff, #ffff00, #ff0000)',
          border: '1px solid rgba(255,255,255,0.08)',
        }} />
        <span style={{ fontSize: 11, color: '#4a5a7a' }}>0 dB</span>
      </div>
    </div>
  );
};
