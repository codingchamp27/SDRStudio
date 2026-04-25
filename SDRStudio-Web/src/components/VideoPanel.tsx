import { useState, useRef, useEffect } from 'react';
import { useSpectrumData } from '../useSpectrumData';
import { SdrService } from '../api';
import { useToast } from '../ToastContext';

export function VideoPanel({ deviceSets }: { deviceSets: any[] }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'spectrum' | 'video'>('spectrum');

  // Find the Tx device set and DATVMod channel
  const dsIdx = deviceSets.findIndex(d =>
    d.samplingDevice?.direction === 1 &&
    d.channels?.some((c: any) => c.id?.includes('DATVMod'))
  );
  const ds = dsIdx >= 0 ? deviceSets[dsIdx] : null;
  const hw = ds?.samplingDevice;
  const cIdx = ds?.channels?.findIndex((c: any) => c.id?.includes('DATVMod')) ?? -1;

  const [hwSettings, setHwSettings] = useState<any>({});
  const [datvSettings, setDatvSettings] = useState<any>({});
  const [tsFileName, setTsFileName] = useState('');

  useEffect(() => {
    if (dsIdx < 0 || cIdx < 0) return;
    SdrService.getDeviceSettings(dsIdx).then(s => {
      const k = Object.keys(s).find(x => x.endsWith('Settings'));
      if (k) setHwSettings(s[k]);
    }).catch(() => {});
    SdrService.getChannelSettings(dsIdx, cIdx).then(s => {
      if (s.DATVModSettings) {
        setDatvSettings(s.DATVModSettings);
        setTsFileName(s.DATVModSettings.tsFileName || '');
      }
    }).catch(() => {});
  }, [dsIdx, cIdx]);

  const patchDatv = async (patch: Record<string, any>) => {
    if (dsIdx < 0 || cIdx < 0) { toast('No DATV Tx channel active', 'error'); return; }
    try {
      // Fetch current settings to get channelType and direction
      const s = await SdrService.getChannelSettings(dsIdx, cIdx);
      const channelType: string = (s.channelType as string) || 'DATVMod';
      const direction: number = (s.direction as number) ?? 1;
      // Only send the keys we actually changed — SDRangel filters by channelSettingsKeys
      await SdrService.patchChannelSettingsKeys(
        dsIdx, cIdx,
        channelType, direction,
        'DATVModSettings', patch
      );
      setDatvSettings((prev: any) => ({ ...prev, ...patch }));
      toast('Settings applied', 'success');
    } catch { toast('Failed to apply settings', 'error'); }
  };

  const patchHw = async (key: string, val: any) => {
    if (dsIdx < 0) { toast('No Tx device active', 'error'); return; }
    try {
      const s = await SdrService.getDeviceSettings(dsIdx);
      const k = Object.keys(s).find(x => x.endsWith('Settings'));
      if (k) {
        s[k][key] = val;
        await SdrService.patchDeviceSettings(dsIdx, s);
        setHwSettings({ ...hwSettings, [key]: val });
      }
    } catch { toast('Failed to patch hardware', 'error'); }
  };

  // Upload: user chooses a .ts file - we read its path via a hidden input
  // Since we're in a browser, we can't get the real OS path. Instead, we let the user
  // type the absolute server path manually, or use the Vite proxy to forward to an upload route.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.ts')) { toast('Please choose a .ts file', 'error'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('tsfile', file);

      // POST to Vite proxy → backend upload handler (if available)
      const resp = await fetch('/api/upload-ts', { method: 'POST', body: fd });
      if (resp.ok) {
        const js = await resp.json();
        const path = js.tsPath || js.path || `/tmp/${file.name}`;
        setUploadedName(file.name);
        setTsFileName(path);
        // tsSource=1 → DATVModSettings::SourceFile (0=SourceImage, 1=SourceFile, 2=SourceUDP)
        await patchDatv({ tsFileName: path, tsSource: 1 });
        toast(`Uploaded: ${file.name}`, 'success');
      } else {
        // Backend upload server not running → just tell the user to set the path manually
        toast('Upload server not available. Enter the file path manually below.', 'error');
      }
    } catch {
      toast('Upload server not reachable. Enter the file path manually.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Spectrum canvas
  const binsRef = useRef<Float32Array | null>(null);
  const [dataSrc, setDataSource] = useState<'LIVE' | 'DEMO' | 'OFFLINE'>('OFFLINE');
  const specRef = useRef<HTMLCanvasElement>(null);

  useSpectrumData({
    binsRef, onDataSource: setDataSource, deviceSetIndex: dsIdx >= 0 ? dsIdx : 0,
    hasDevice: !!hw, isRunning: hw?.state === 1 || hw?.state === 'running',
    isApiConnected: true, wsPort: 8887 + (dsIdx >= 0 ? dsIdx : 0),
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
        ctx.beginPath(); ctx.strokeStyle = '#0078d7'; ctx.lineWidth = 1.5;
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

  const isPlaying = datvSettings?.tsFilePlay === 1;
  const isLooping = datvSettings?.tsFilePlayLoop === 1;

  return (
    <>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📡 Transmitted Video</span>
        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', background: dataSrc === 'LIVE' ? '#2ed57322' : '#33333344', color: dataSrc === 'LIVE' ? '#2ed573' : '#888', border: `1px solid ${dataSrc === 'LIVE' ? '#2ed573' : '#333'}` }}>
          {dataSrc}
        </span>
      </div>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Tabs Row */}
        <div style={{ display: 'flex', gap: '6px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center', flexShrink: 0 }}>
          <button className={`btn ${activeTab === 'spectrum' ? 'primary' : ''}`} onClick={() => setActiveTab('spectrum')}>Spectrum</button>
          <button className={`btn ${activeTab === 'video' ? 'primary' : ''}`} onClick={() => setActiveTab('video')}>Video</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#666' }}>Upload .ts</span>
            <input type="file" ref={fileInputRef} accept=".ts" style={{ display: 'none' }} onChange={handleUpload} />
            <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? '⌛ Uploading...' : '⬆ Choose File'}
            </button>
            {uploadedName && <span style={{ fontSize: '10px', color: '#2ed573' }}>✓ {uploadedName}</span>}
          </div>
        </div>

        {/* Canvas / Video */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {activeTab === 'spectrum' ? (
            <canvas ref={specRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: '#555', fontSize: '13px' }}>No browser video preview</span>
              <span style={{ color: '#444', fontSize: '11px' }}>Live video plays through SDRangel + DATV receiver</span>
            </div>
          )}
        </div>

        {/* Manual path entry */}
        <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', color: '#666', whiteSpace: 'nowrap' }}>TS Path:</span>
          <input
            type="text" value={tsFileName}
            onChange={e => setTsFileName(e.target.value)}
            onBlur={() => patchDatv({ tsFileName, tsSource: 1 /* SourceFile */ })}
            onKeyDown={e => e.key === 'Enter' && patchDatv({ tsFileName, tsSource: 1 /* SourceFile */ })}
            style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#ccc', fontSize: '11px', padding: '4px 6px', borderRadius: '3px' }}
            placeholder="/path/to/video.ts"
          />
          <button className="btn" onClick={() => patchDatv({ tsFileName, tsSource: 1 /* SourceFile */ })}>Set</button>
        </div>

        {/* Controls */}
        <div style={{ padding: '8px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#aaa', cursor: 'pointer' }}>
            <input type="checkbox" checked={isLooping} onChange={e => patchDatv({ tsFilePlayLoop: e.target.checked ? 1 : 0 })} />
            Loop Video
          </label>

          <button
            className={`btn ${isPlaying ? 'danger' : 'success'}`}
            onClick={() => patchDatv({ tsFilePlay: isPlaying ? 0 : 1 })}
          >
            {isPlaying ? '⏸ Pause' : '▶ Start'}
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>Tx Gain</span>
              <input type="number" min={0} max={80}
                value={hwSettings?.gain ?? 50}
                onChange={e => setHwSettings({ ...hwSettings, gain: Number(e.target.value) })}
                onBlur={e => patchHw('gain', Number(e.target.value))}
                style={{ width: 52, padding: '3px 4px', fontSize: '11px', background: '#1a1a1a', color: '#fff', border: '1px solid #444', borderRadius: '3px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>Mod</span>
              <span style={{ fontSize: '11px', color: '#ccc', background: '#1a1a1a', padding: '3px 8px', border: '1px solid #444', borderRadius: '3px' }}>
                {datvSettings?.modulation === 0 ? 'BPSK' : 'QPSK'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>SR</span>
              <span style={{ fontSize: '11px', color: '#ccc', background: '#1a1a1a', padding: '3px 6px', border: '1px solid #444', borderRadius: '3px' }}>
                {hwSettings?.devSampleRate ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
