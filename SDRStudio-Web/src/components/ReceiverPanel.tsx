import { useState, useRef, useEffect } from 'react';
import { useSpectrumData } from '../useSpectrumData';
import { SdrService } from '../api';

export function ReceiverPanel({ deviceSets }: { deviceSets: any[] }) {
  const [activeTab, setActiveTab] = useState<'spectrum' | 'video'>('spectrum');

  // Find the Rx device set and DATVDemod channel
  const dsIdx = deviceSets.findIndex(d =>
    d.samplingDevice?.direction === 0 &&
    d.channels?.some((c: any) => c.id?.includes('DATVDemod'))
  );
  const ds = dsIdx >= 0 ? deviceSets[dsIdx] : null;
  const hw = ds?.samplingDevice;
  const cIdx = ds?.channels?.findIndex((c: any) => c.id?.includes('DATVDemod')) ?? -1;

  const [demodSettings, setDemodSettings] = useState<any>({});

  useEffect(() => {
    if (dsIdx < 0 || cIdx < 0) return;
    SdrService.getChannelSettings(dsIdx, cIdx).then(s => {
      const k = Object.keys(s).find(x => x.endsWith('Settings'));
      if (k) setDemodSettings(s[k]);
    }).catch(() => {});
  }, [dsIdx, cIdx]);

  // Spectrum canvas
  const binsRef = useRef<Float32Array | null>(null);
  const [dataSrc, setDataSource] = useState<'LIVE' | 'DEMO' | 'OFFLINE'>('OFFLINE');
  const specRef = useRef<HTMLCanvasElement>(null);

  useSpectrumData({
    binsRef, onDataSource: setDataSource,
    deviceSetIndex: dsIdx >= 0 ? dsIdx : 1,
    hasDevice: !!hw,
    isRunning: hw?.state === 1 || hw?.state === 'running',
    isApiConnected: true,
    wsPort: 8887 + (dsIdx >= 0 ? dsIdx : 1),
  });

  useEffect(() => {
    if (activeTab !== 'spectrum') return;
    const cvs = specRef.current; if (!cvs) return;
    const ctx = cvs.getContext('2d'); if (!ctx) return;
    cvs.width = cvs.clientWidth || 800;
    cvs.height = cvs.clientHeight || 160;
    const W = cvs.width, H = cvs.height;
    let raf: number;
    const draw = () => {
      const bins = binsRef.current;
      ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = W / 2 % 40; x < W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 20; y < H; y += 20) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      if (bins && bins.length > 0) {
        ctx.beginPath(); ctx.strokeStyle = '#2ed573'; ctx.lineWidth = 1.5;
        const step = bins.length / W;
        ctx.moveTo(0, H);
        for (let i = 0; i < W; i++) {
          const db = bins[Math.floor(i * step)];
          const y = Math.max(0, Math.min(H - 2, (H - 2) * (1 - (db + 110) / 110)));
          ctx.lineTo(i, y);
        }
        ctx.lineTo(W, H); ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [activeTab]);

  const getStdLabel = (v: number) => v === 0 ? 'DVB-S' : 'DVB-S2';
  const getFecLabel = (v: number) => ['1/2','2/3','3/4','5/6','7/8','4/5','8/9','9/10','1/4','1/3'][v] ?? '—';
  const getModLabel = (v: number) => ['BPSK','QPSK','PSK8','APSK16','APSK32','APSK64','APSK128','APSK256'][v] ?? '—';

  return (
    <>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📻 Received Video</span>
        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', background: dataSrc === 'LIVE' ? '#2ed57322' : '#33333344', color: dataSrc === 'LIVE' ? '#2ed573' : '#888', border: `1px solid ${dataSrc === 'LIVE' ? '#2ed573' : '#333'}` }}>
          {dataSrc}
        </span>
      </div>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Tabs Row */}
        <div style={{ display: 'flex', gap: '6px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button className={`btn ${activeTab === 'spectrum' ? 'primary' : ''}`} style={{ '--btn-active': '#2ed573' } as any} onClick={() => setActiveTab('spectrum')}>
            Rx Spectrum
          </button>
          <button className={`btn ${activeTab === 'video' ? 'primary' : ''}`} onClick={() => setActiveTab('video')}>
            Demod Info
          </button>
        </div>

        {/* Canvas / Demod Info */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {activeTab === 'spectrum' ? (
            <canvas ref={specRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          ) : (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', boxSizing: 'border-box' }}>
              {cIdx >= 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    ['Standard', getStdLabel(demodSettings?.standard ?? 0)],
                    ['Modulation', getModLabel(demodSettings?.modulation ?? 1)],
                    ['FEC', getFecLabel(demodSettings?.fec ?? 0)],
                    ['Symbol Rate', `${demodSettings?.symbolRate ?? '—'} Bd`],
                    ['TS Delta', `${demodSettings?.tsDeltaF ?? '—'} Hz`],
                    ['TS BER', `${demodSettings?.tsBER ?? '—'}`],
                  ].map(([label, val]) => (
                    <div key={label} className="datv-panel" style={{ textAlign: 'center', padding: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#888' }}>{label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ccc', marginTop: '4px' }}>{val}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '20px' }}>📻</span>
                  <span>No DATVDemod channel active</span>
                  <span style={{ fontSize: '11px', color: '#444' }}>Add a DATVDemod plugin in the SDRangel Rx workspace</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Bar */}
        <div style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '16px', fontSize: '11px', color: '#666', flexShrink: 0 }}>
          <span>CF: <span style={{ color: '#ccc' }}>{hw?.centerFrequency ? `${(hw.centerFrequency / 1e6).toFixed(3)} MHz` : '—'}</span></span>
          <span>SR: <span style={{ color: '#ccc' }}>{hw?.bandwidth ? `${(hw.bandwidth / 1e6).toFixed(2)} MS/s` : '—'}</span></span>
          <span style={{ marginLeft: 'auto' }}>HW: <span style={{ color: '#ccc' }}>{hw?.hwType ?? '—'}</span></span>
        </div>
      </div>
    </>
  );
}
