import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Trash2, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import {
  type DeviceSet, getDeviceSettings, patchDeviceSettings,
  startDevice, stopDevice, getDeviceReport
} from '../api';

interface DeviceCardProps {
  ds: DeviceSet;
  onDelete: () => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ ds, onDelete }) => {
  const index = ds.devicesetIndex ?? 0;
  const hw = ds.samplingDevice?.hwType ?? 'Unknown Device';
  const dir = ds.samplingDevice?.direction === 1 ? 'TX' : 'RX';
  const [running, setRunning] = useState(ds.samplingDevice?.state === 'running');
  const [loading, setLoading] = useState(false);
  const [freqMHz, setFreqMHz] = useState(
    ((ds.samplingDevice?.centerFrequency ?? 100000000) / 1e6).toFixed(3)
  );
  const [gain, setGain] = useState(30);
  const [report, setReport] = useState<Record<string, unknown>>({});
  const [expanded, setExpanded] = useState(true);

  // Poll device report every 3s when running
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      getDeviceReport(index).then(setReport).catch(() => {});
    }, 3000);
    getDeviceReport(index).then(setReport).catch(() => {});
    return () => clearInterval(id);
  }, [running, index]);

  const handleStartStop = async () => {
    setLoading(true);
    try {
      if (running) { await stopDevice(index); setRunning(false); }
      else          { await startDevice(index); setRunning(true);  }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const applyFrequency = useCallback(async () => {
    const freqHz = Math.round(parseFloat(freqMHz) * 1e6);
    if (isNaN(freqHz)) return;
    try {
      const settings = await getDeviceSettings(index) as { usrpInputSettings?: Record<string, unknown>; usrpOutputSettings?: Record<string, unknown> };
      const key = dir === 'TX' ? 'usrpOutputSettings' : 'usrpInputSettings';
      const sub = (settings[key] as Record<string,unknown>) ?? {};
      await patchDeviceSettings(index, { [key]: { ...sub, centerFrequency: freqHz } });
    } catch { /* ignore */ }
  }, [freqMHz, index, dir]);

  const accentColor = dir === 'TX' ? '#ffaa00' : '#00ff88';

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: running ? '#00ff88' : '#4a5a7a',
          boxShadow: running ? '0 0 6px #00ff88' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#e8f0fe' }}>Device Set {index + 1}: {hw || 'No Device Set'}</span>
        <span className={`badge badge-${dir === 'TX' ? 'tx' : 'rx'}`}>{dir}</span>
        <span style={{ color: '#4a5a7a' }}>{expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</span>
      </div>

      {expanded && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Frequency */}
          <div className="form-group">
            <label className="form-label">Center Frequency (MHz)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-icon" onClick={() => setFreqMHz(f => (parseFloat(f) - 1).toFixed(3))} title="-1 MHz">
                <ChevronDown size={14} />
              </button>
              <input
                type="number" step="0.001"
                value={freqMHz}
                onChange={e => setFreqMHz(e.target.value)}
                className="form-input"
                style={{ textAlign: 'center' }}
              />
              <button className="btn-icon" onClick={() => setFreqMHz(f => (parseFloat(f) + 1).toFixed(3))} title="+1 MHz">
                <ChevronUp size={14} />
              </button>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={applyFrequency}>
              Apply Frequency
            </button>
          </div>

          {/* Gain */}
          <div className="form-group">
            <label className="form-label">Gain: {gain} dB</label>
            <input
              type="range" min={0} max={70} value={gain}
              onChange={e => setGain(Number(e.target.value))}
              style={{ accentColor }}
            />
          </div>

          {/* Report */}
          {Object.keys(report).length > 0 && (
            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4a5a7a',
              maxHeight: 80, overflowY: 'auto',
            }}>
              {JSON.stringify(report, null, 2).slice(0, 300)}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${running ? 'btn-danger' : 'btn-success'}`}
              style={{ flex: 1 }}
              onClick={handleStartStop}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : running ? <><Square size={13}/> Stop</> : <><Play size={13}/> Start</>}
            </button>
            <button className="btn-icon" title="Settings">
              <Settings size={15} />
            </button>
            <button
              className="btn-icon"
              title="Delete device set"
              style={{ color: '#ff4444', borderColor: 'rgba(255,68,68,0.3)' }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
