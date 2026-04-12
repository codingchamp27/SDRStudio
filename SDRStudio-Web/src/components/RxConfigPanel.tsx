import { useState, useEffect } from 'react';
import { SdrService } from '../api';
import { useToast } from '../ToastContext';

export function RxConfigPanel({ deviceSets, onRefresh }: { deviceSets: any[], onRefresh: () => void }) {
  const { toast } = useToast();

  // Find the Rx device set
  const dsIdx = deviceSets.findIndex(d => d.samplingDevice?.direction === 0);
  const ds = dsIdx >= 0 ? deviceSets[dsIdx] : null;
  const hw = ds?.samplingDevice;
  const cIdx = ds?.channels?.findIndex((c: any) => c.id?.includes('DATVDemod')) ?? -1;

  const [centerFreq, setCenterFreq] = useState('');
  const [symbolRate, setSymbolRate] = useState('');
  const [gain, setGain] = useState('30');
  const isRunning = hw?.state === 1 || hw?.state === 'running';

  useEffect(() => {
    if (hw) {
      setCenterFreq(String(hw.centerFrequency ?? 435000000));
    }
    if (dsIdx >= 0 && cIdx >= 0) {
      SdrService.getChannelSettings(dsIdx, cIdx).then(s => {
        const k = Object.keys(s).find(x => x.endsWith('Settings'));
        if (k) setSymbolRate(String(s[k].symbolRate ?? 1000000));
      }).catch(() => {});
    }
  }, [dsIdx, cIdx, hw]);

  const applyFreq = async () => {
    if (dsIdx < 0) { toast('No Rx device active', 'error'); return; }
    try {
      const s = await SdrService.getDeviceSettings(dsIdx);
      const k = Object.keys(s).find(x => x.endsWith('Settings'));
      if (k) { s[k].centerFrequency = Number(centerFreq); await SdrService.patchDeviceSettings(dsIdx, s); }
      toast('Center frequency applied', 'success');
      onRefresh();
    } catch { toast('Failed to set frequency', 'error'); }
  };

  const applySymbolRate = async () => {
    if (dsIdx < 0 || cIdx < 0) { toast('No DATVDemod channel', 'error'); return; }
    try {
      const s = await SdrService.getChannelSettings(dsIdx, cIdx);
      const k = Object.keys(s).find(x => x.endsWith('Settings'));
      if (k) { s[k].symbolRate = Number(symbolRate); await SdrService.patchChannelSettings(dsIdx, cIdx, s); }
      toast('Symbol rate applied', 'success');
    } catch { toast('Failed to set symbol rate', 'error'); }
  };

  const handleStartStop = async () => {
    if (dsIdx < 0) { toast('No Rx device active', 'error'); return; }
    try {
      await SdrService.setDeviceState(dsIdx, isRunning ? 0 : 1);
      toast(isRunning ? 'Rx stopped' : 'Rx started', 'success');
      setTimeout(onRefresh, 800);
    } catch { toast('Failed to toggle Rx state', 'error'); }
  };

  return (
    <>
      <div className="panel-header">⚙ Receiver Config</div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        <button
          className={`btn ${isRunning ? 'danger' : 'success'}`}
          style={{ width: '100%', justifyContent: 'center', padding: '8px' }}
          onClick={handleStartStop}
        >
          {isRunning ? '⏹ Stop Rx Engine' : '▶ Start Rx Engine'}
        </button>

        <div className="datv-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: '#888' }}>Center Frequency (Hz)</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input type="number" value={centerFreq} onChange={e => setCenterFreq(e.target.value)}
              style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#ccc', fontSize: '12px', padding: '5px 8px', borderRadius: '3px' }} />
            <button className="btn primary" onClick={applyFreq}>Set</button>
          </div>
        </div>

        <div className="datv-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: '#888' }}>Symbol Rate (Bd)</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input type="number" value={symbolRate} onChange={e => setSymbolRate(e.target.value)}
              style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#ccc', fontSize: '12px', padding: '5px 8px', borderRadius: '3px' }} />
            <button className="btn primary" onClick={applySymbolRate}>Set</button>
          </div>
        </div>

        <div className="datv-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: '#888' }}>Rx Gain (0–76 dB)</label>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input type="range" min={0} max={76} value={gain}
              onChange={e => setGain(e.target.value)}
              style={{ flex: 1 }} />
            <span style={{ fontSize: '12px', color: '#ccc', width: '36px', textAlign: 'right' }}>{gain}</span>
          </div>
        </div>

        <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={onRefresh}>
          🔄 Sync Status
        </button>
      </div>
    </>
  );
}
