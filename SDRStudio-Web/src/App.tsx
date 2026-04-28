import { useState, useEffect, createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { SdrService } from './api';
import type { SdrChannelDef } from './api';
import './App.css';
import mpegts from 'mpegts.js';

function TsPlayer({ filePath }: { filePath: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!filePath || !videoRef.current || !mpegts.isSupported()) return;

    const streamUrl = `/api/stream?path=${encodeURIComponent(filePath)}`;
    const player = mpegts.createPlayer({
      type: 'm2ts',
      isLive: true,
      url: streamUrl,
    }, {
      enableWorker: true,
      enableStashBuffer: false,
      stashInitialSize: 128,
      lazyLoad: false,
    });
    
    player.attachMediaElement(videoRef.current);
    player.load();

    player.on(mpegts.Events.ERROR, (type, detail, info) => {
      console.error('mpegts error:', type, detail, info);
      if (detail === mpegts.ErrorDetails.MEDIA_FORMAT_ERROR || detail === mpegts.ErrorDetails.MEDIA_FORMAT_UNSUPPORTED) {
        toast('Video format or codec not supported by browser. Try H.264/AVC.', 'error');
      }
    });

    const playVideo = async () => {
      try {
        if (videoRef.current) {
          await player.play();
        }
      } catch (e) {
        console.error("Playback failed:", e);
      }
    };

    playVideo();

    return () => {
      try {
        player.pause();
        player.unload();
        player.detachMediaElement();
        player.destroy();
      } catch(e) {}
    };
  }, [filePath, toast]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <video 
        ref={videoRef} 
        controls 
        muted 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
      />
      {!mpegts.isSupported() && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4757', textAlign: 'center', padding: '20px' }}>
          Browser does not support MediaSource Extensions.
        </div>
      )}
    </div>
  );
}

// --- TOAST CONTEXT ---
interface Toast {
  id: number;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
}
interface ToastContextType {
  toast: (message: string, type?: 'error' | 'warning' | 'info' | 'success') => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, type: 'error' | 'warning' | 'info' | 'success' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`sdr-toast ${t.type}`}>
            <div className="toast-msg">
              <h4>{t.type.toUpperCase()}</h4>
              <p>{t.message}</p>
            </div>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>✖</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};


interface DeviceSet {
  channelrx?: number;
  channeltx?: number;
  channels?: any[];
  samplingDevice?: {
    hwType: string;
    direction: number;
    centerFrequency: number;
    state: number | string;
    displayedName?: string;
    serial?: string;
    sequence?: number;
    deviceStreamIndex?: number;
    devSampleRate?: number;
  };
}





function DeviceSelectionModal({ direction, onClose, onConfirm }: { direction: 0 | 1, onClose: () => void, onConfirm: (dev: any) => void }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedHwIdx, setSelectedHwIdx] = useState<number>(-1);
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const devs = await SdrService.getAvailableDevices(direction);
      const unbound = devs.filter(d => d.deviceSetIndex === -1);
      setDevices(unbound);
      if (unbound.length > 0) setSelectedHwIdx(unbound[0].index);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchDevices(); }, [direction]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Select sampling device</span>
          <button className="toast-close" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ padding: '16px' }}>
           <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '8px' }}>Select from list</label>
           <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
             <select 
               className="sdr-select"
               style={{ flex: 1, background: '#252528', color: '#fff', border: '1px solid #444', padding: '6px' }}
               value={String(selectedHwIdx)}
               onChange={e => setSelectedHwIdx(Number(e.target.value))}
             >
               {devices.map(d => (
                 <option key={d.hwType + d.index} value={String(d.index)}>{d.displayedName}</option>
               ))}
               {devices.length === 0 && <option disabled value="-1">No unbound devices</option>}
             </select>
             <button className="sdr-btn" onClick={fetchDevices} title="Refresh" style={{ padding: '6px 10px', fontSize: '14px' }}>
               {loading ? '⌛' : '↻'}
             </button>
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="sdr-btn cancel" onClick={onClose} style={{ padding: '6px 16px', background: 'transparent', border: '1px solid #e67e22', color: '#e67e22', borderRadius: '4px' }}>Cancel</button>
              <button 
                className="sdr-btn" 
                disabled={selectedHwIdx === -1}
                onClick={() => {
                  const d = devices.find(x => x.index === selectedHwIdx);
                  if (d) onConfirm(d);
                }}
                style={{ padding: '6px 16px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px', opacity: selectedHwIdx !== -1 ? 1 : 0.5 }}
              >OK</button>
           </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================─── PREFERENCES MODAL ────────────────────────────────────────────────────────
function PreferencesModal({ onClose }: { onClose: () => void }) {
  const [apiHost, setApiHost] = useState('127.0.0.1');
  const [apiPort, setApiPort] = useState('8091');
  const [pollInterval, setPollInterval] = useState('2000');
  const { toast } = useToast();

  const handleSave = () => {
    // Store in localStorage for now (the real endpoint is the Vite proxy, so runtime changes aren't wired yet)
    localStorage.setItem('sdr_api_host', apiHost);
    localStorage.setItem('sdr_api_port', apiPort);
    localStorage.setItem('sdr_poll_ms', pollInterval);
    toast(`Preferences saved. Reload the page to apply changes.`, 'success');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: '380px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>⚙ Preferences</span>
          <button className="toast-close" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="setting-group">
            <label style={{ color: '#ccc' }}>API Host</label>
            <input className="freq-number" style={{ fontSize: '13px', padding: '4px 8px' }}
              value={apiHost} onChange={e => setApiHost(e.target.value)} placeholder="127.0.0.1" />
          </div>
          <div className="setting-group">
            <label style={{ color: '#ccc' }}>API Port</label>
            <input className="freq-number" type="number" style={{ fontSize: '13px', padding: '4px 8px' }}
              value={apiPort} onChange={e => setApiPort(e.target.value)} placeholder="8091" />
          </div>
          <div className="setting-group">
            <label style={{ color: '#ccc' }}>Poll Interval (ms)</label>
            <input className="freq-number" type="number" style={{ fontSize: '13px', padding: '4px 8px' }}
              value={pollInterval} onChange={e => setPollInterval(e.target.value)} placeholder="2000" />
          </div>
          <div style={{ padding: '8px', background: 'rgba(255,165,0,0.1)', border: '1px solid #553300', borderRadius: '4px', fontSize: '11px', color: '#fa0' }}>
            ⚠️ API routing is configured via the Vite proxy in vite.config.ts. Saved values are stored locally and will be applied on next reload.
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
          <div style={{ fontSize: '11px', color: '#666' }}>
            <strong style={{ color: '#aaa' }}>Backend command:</strong><br />
            <code style={{ fontSize: '11px', background: '#111', padding: '4px 8px', borderRadius: '3px', display: 'block', marginTop: '4px', color: '#7bed9f' }}>
              ./sdrangel --api-address {apiHost} --api-port {apiPort}
            </code>
          </div>
        </div>
        <div className="modal-footer">
          <button className="sdr-btn" onClick={onClose}>Cancel</button>
          <button className="sdr-btn success" onClick={handleSave}>💾 Save</button>
        </div>
      </div>
    </div>
  );
}

function PluginRegistryModal({
  onClose,
  onApply,
  direction
}: {
  onClose: () => void;
  onApply: (pluginId: string) => void;
  direction: number
}) {
  const [plugins, setPlugins] = useState<SdrChannelDef[]>([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    SdrService.getChannels(direction).then(data => {
      // Filter by direction: 0 = Rx, 1 = Tx
      setPlugins(data.filter(p => p.direction === direction));
    }).catch(e => console.error(e));
  }, [direction]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Add Channel Component</span>
          <button className="toast-close" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body">
          <div className="plugin-list">
            {plugins.map(p => (
              <div
                key={p.id}
                className={`plugin-item ${selected === p.id ? 'selected' : ''}`}
                onClick={() => setSelected(p.id)}
              >
                {p.name} <span style={{ fontSize: '10px', color: '#999', float: 'right' }}>v{p.version}</span>
              </div>
            ))}
            {plugins.length === 0 && <span style={{ color: '#888', padding: '10px' }}>Loading available plugins...</span>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="sdr-btn" onClick={onClose}>Close</button>
          <button className="sdr-btn success" disabled={!selected} onClick={() => onApply(selected)}>Apply</button>
        </div>
      </div>
    </div>
  );
}

// ─── PRESETS MODAL ────────────────────────────────────────────────────────────
interface Preset { type: string; group: string; description: string; centerFrequency: number; }

function PresetsModal({ onClose, deviceSetCount }: { onClose: () => void; deviceSetCount: number }) {
  const { toast } = useToast();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selected, setSelected] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState('Default');
  const [newDesc, setNewDesc] = useState('');
  const [targetDs, setTargetDs] = useState(0);

  const refresh = () => {
    setLoading(true);
    SdrService.getPresets()
      .then(data => { setPresets(data || []); setLoading(false); })
      .catch(() => { setPresets([]); setLoading(false); toast('Backend offline – no presets available', 'warning'); });
  };

  useEffect(() => { refresh(); }, []);

  const handleLoad = async () => {
    if (!selected) return;
    try {
      await SdrService.loadPreset(selected.group, selected.description, targetDs);
      toast(`Preset "${selected.description}" loaded onto device set ${targetDs}`, 'success');
      onClose();
    } catch { toast('Failed to load preset', 'error'); }
  };

  const handleSave = async () => {
    if (!newDesc.trim()) return toast('Enter a preset name first', 'warning');
    try {
      await SdrService.savePreset(newGroup, newDesc, targetDs);
      toast(`Saved preset "${newDesc}"`, 'success');
      refresh();
    } catch { toast('Failed to save preset', 'error'); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await SdrService.deletePreset(selected.group, selected.description);
      toast(`Deleted preset "${selected.description}"`, 'info');
      setSelected(null);
      refresh();
    } catch { toast('Failed to delete preset', 'error'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: '520px', maxHeight: '75vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>⭐ Preset Manager</span>
          <button className="toast-close" onClick={onClose}>✖</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', gap: '12px' }}>
          {/* Left – preset list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Available Presets</span>
            <div className="plugin-list" style={{ flex: 1, maxHeight: '280px' }}>
              {loading && <span style={{ color: '#888', padding: '10px' }}>Loading…</span>}
              {!loading && presets.length === 0 && (
                <span style={{ color: '#666', padding: '10px', fontSize: '12px' }}>No presets saved yet</span>
              )}
              {presets.map((p, i) => (
                <div
                  key={i}
                  className={`plugin-item ${selected === p ? 'selected' : ''}`}
                  onClick={() => setSelected(p)}
                >
                  <span style={{ fontWeight: 600 }}>{p.description}</span>
                  <span style={{ fontSize: '10px', color: '#999', float: 'right' }}>{p.group}</span>
                  <br />
                  <span style={{ fontSize: '10px', color: '#777' }}>
                    {p.type} · {(p.centerFrequency / 1e6).toFixed(3)} MHz
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Right – actions */}
          <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>Load / Delete Selected</span>
            <div className="freq-display-box" style={{ padding: '4px' }}>
              <label style={{ fontSize: '10px', color: '#888' }}>Device Set</label>
              <select value={targetDs} onChange={e => setTargetDs(Number(e.target.value))}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', marginLeft: '4px' }}>
                {Array.from({ length: deviceSetCount }, (_, i) => (
                  <option key={i} value={i}>DS {i}</option>
                ))}
              </select>
            </div>
            <button className="sdr-btn success" disabled={!selected} onClick={handleLoad}>▶ Load</button>
            <button className="sdr-btn" style={{ color: '#ff6b6b' }} disabled={!selected} onClick={handleDelete}>🗑 Delete</button>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
            <span style={{ fontSize: '11px', color: '#888' }}>Save Current State</span>
            <input
              className="freq-number" style={{ fontSize: '12px', padding: '4px' }}
              placeholder="Preset name…" value={newDesc} onChange={e => setNewDesc(e.target.value)}
            />
            <input
              className="freq-number" style={{ fontSize: '12px', padding: '4px' }}
              placeholder="Group (e.g. Default)" value={newGroup} onChange={e => setNewGroup(e.target.value)}
            />
            <button className="sdr-btn success" onClick={handleSave}>💾 Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FEATURE SIDEBAR ──────────────────────────────────────────────────────────
interface ActiveFeature { id: string; title: string; featureType: string; running: boolean; }

function FeatureSidebar({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string; version: string }>>([]);
  const [active, setActive] = useState<ActiveFeature[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState('');

  const refresh = () => {
    SdrService.getAvailableFeatures()
      .then(data => setCatalog(data || []))
      .catch(() => setCatalog([]));
    SdrService.getFeatureSet()
      .then(data => {
        const features = (data?.features || []).map((f: any, i: number) => ({
          id: String(i),
          title: f.title || f.featureType,
          featureType: f.featureType,
          running: f.state === 1 || f.state === 'running',
        }));
        setActive(features);
      })
      .catch(() => setActive([]));
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    if (!selectedCatalog) return toast('Select a feature first', 'warning');
    try {
      await SdrService.addFeature(selectedCatalog);
      toast(`Feature "${selectedCatalog}" added`, 'success');
      refresh();
    } catch { toast('Failed to add feature (backend may be offline)', 'error'); }
  };

  const handleToggleRun = async (f: ActiveFeature) => {
    // Optimistic UI update for immediate response
    setActive(prev => prev.map(p => p.id === f.id ? { ...p, running: !f.running } : p));
    try {
      await SdrService.runFeature(Number(f.id), !f.running);
      toast(`Feature ${f.running ? 'stopped' : 'started'}`, 'info');
      refresh();
    } catch {
      // Revert optimistic update on failure
      setActive(prev => prev.map(p => p.id === f.id ? { ...p, running: f.running } : p));
      toast('Failed to toggle feature state', 'error');
    }
  };

  const handleDelete = async (f: ActiveFeature) => {
    try {
      await SdrService.deleteFeature(Number(f.id));
      toast(`Feature "${f.featureType}" removed`, 'info');
      refresh();
    } catch { toast('Failed to delete feature', 'error'); }
  };

  return (
    <div className="feature-sidebar">
      <div className="channel-header" style={{ background: 'rgba(155, 89, 182, 0.25)' }}>
        <span style={{ fontWeight: 700 }}>⚙ Features</span>
        <button className="sdr-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>✖</button>
      </div>

      {/* Catalog picker */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <select
          value={selectedCatalog}
          onChange={e => setSelectedCatalog(e.target.value)}
          style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', outline: 'none' }}
        >
          <option value="">Select feature plugin…</option>
          {catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {catalog.length === 0 && <option disabled>Backend offline</option>}
        </select>
        <button className="sdr-btn" onClick={handleAdd} style={{ background: 'rgba(46, 213, 115, 0.15)', color: '#2ed573', border: '1px solid rgba(46,213,115,0.4)', borderRadius: '4px', padding: '6px 12px', fontWeight: 'bold' }}>✚ Add</button>
      </div>

      {/* Active features list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {active.length === 0 && (
          <div style={{ padding: '16px', color: '#555', fontSize: '12px', textAlign: 'center' }}>
            No features active.<br />Add one from the list above.
          </div>
        )}
        {active.map(f => (
          <div key={f.id} className="channel-card" style={{ margin: '8px', padding: 0, border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
            <div className="channel-header" style={{ background: f.running ? 'rgba(46,213,115,0.15)' : 'rgba(255,255,255,0.05)', padding: '8px 10px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>F:{f.id} <span style={{color: '#ddd', fontWeight: 400}}>{f.title}</span></span>
              <div className="navbar-group" style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                <button
                  className="sdr-btn"
                  style={{ 
                    color: f.running ? '#fff' : '#aaa', 
                    background: f.running ? 'rgba(255, 107, 107, 0.8)' : 'rgba(46, 213, 115, 0.8)',
                    padding: '4px 10px', borderRadius: '4px', border: 'none', fontSize: '12px', fontWeight: 'bold'
                  }}
                  onClick={() => handleToggleRun(f)}
                  title={f.running ? 'Stop Feature' : 'Start Feature'}
                >
                  {f.running ? '⏹ Stop' : '▶ Start'}
                </button>
                <button className="sdr-btn" style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', padding: '4px 8px', borderRadius: '4px' }} onClick={() => handleDelete(f)} title="Delete">✖</button>
              </div>
            </div>
            <div style={{ padding: '8px 10px', fontSize: '11px', color: '#aaa', background: 'rgba(0,0,0,0.2)' }}>
              Plugin: <span style={{ color: '#fff' }}>{f.featureType}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DYNAMIC SETTINGS EDITOR ────────────────────────────────────────────────────
function DynamicSettingsEditor({ settings, onChange }: { settings: Record<string, any>, onChange: (field: string, value: any) => void }) {
  // Filter out keys already handled in the main card, or complex nested objects
  const ignoredKeys = new Set([
    'inputFrequencyOffset', 'squelch', 'volume', 'inputVolumeFactor', 
    'title', 'deviceMacAddress', 'rgbColor', 'ts', 'magSqThreshold', 'magSqThresholdIndex',
    'channelType', 'direction'
  ]);

  return (
    <div className="dynamic-settings-grid" style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', 
      padding: '8px', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--border-color)',
      maxHeight: '200px', overflowY: 'auto'
    }}>
      {Object.entries(settings).map(([key, rawValue]) => {
        if (ignoredKeys.has(key)) return null;
        if (typeof rawValue === 'object' && rawValue !== null) return null; // Skip nested structs for now
        
        const isBool = key.toLowerCase().includes('mute') 
          || key.toLowerCase().includes('agc') 
          || key.toLowerCase().includes('enable')
          || key.toLowerCase().includes('use')
          || typeof rawValue === 'boolean';

        if (isBool) {
          const bVal = rawValue === 1 || rawValue === true || rawValue === 'true';
          return (
            <div key={key} className="setting-group compact" style={{ margin: 0 }}>
              <label style={{ fontSize: '10px' }}>{key}</label>
              <input type="checkbox" checked={bVal} 
                onChange={e => onChange(key, e.target.checked ? 1 : 0)} 
              />
            </div>
          );
        }

        if (typeof rawValue === 'number') {
          const selectStyle = { width: '100%', padding: '2px', fontSize: '11px', background: 'var(--bg-medium)', color: '#fff', border: '1px solid var(--border-color)' };
          
          if (key === 'tsSource' || key === 'atvModInput') {
             return (
               <div key={key} className="setting-group compact" style={{ margin: 0 }}>
                 <label style={{ fontSize: '10px' }}>{key}</label>
                 <select value={rawValue} onChange={e => onChange(key, Number(e.target.value))} style={selectStyle}>
                   <option value={0}>Image</option>
                   <option value={1}>File</option>
                   <option value={2}>UDP</option>
                 </select>
               </div>
             );
          }
          if (key === 'modulation') {
             return (
               <div key={key} className="setting-group compact" style={{ margin: 0 }}>
                 <label style={{ fontSize: '10px' }}>{key}</label>
                 <select value={rawValue} onChange={e => onChange(key, Number(e.target.value))} style={selectStyle}>
                   <option value={0}>BPSK</option>
                   <option value={1}>QPSK</option>
                   <option value={2}>8PSK</option>
                   <option value={3}>16APSK</option>
                   <option value={4}>32APSK</option>
                 </select>
               </div>
             );
          }
          if (key === 'fec') {
             return (
               <div key={key} className="setting-group compact" style={{ margin: 0 }}>
                 <label style={{ fontSize: '10px' }}>{key}</label>
                 <select value={rawValue} onChange={e => onChange(key, Number(e.target.value))} style={selectStyle}>
                   <option value={0}>1/2</option>
                   <option value={1}>2/3</option>
                   <option value={2}>3/4</option>
                   <option value={3}>5/6</option>
                   <option value={4}>7/8</option>
                   <option value={5}>4/5</option>
                   <option value={6}>8/9</option>
                   <option value={7}>9/10</option>
                 </select>
               </div>
             );
          }
          if (key === 'standard') {
             return (
               <div key={key} className="setting-group compact" style={{ margin: 0 }}>
                 <label style={{ fontSize: '10px' }}>{key}</label>
                 <select value={rawValue} onChange={e => onChange(key, Number(e.target.value))} style={selectStyle}>
                   <option value={0}>DVB-S</option>
                   <option value={1}>DVB-S2</option>
                 </select>
               </div>
             );
          }

          return (
            <div key={key} className="setting-group compact" style={{ margin: 0 }}>
              <label style={{ fontSize: '10px' }}>{key}</label>
              <input type="number" defaultValue={rawValue} 
                onBlur={e => onChange(key, Number(e.target.value))} 
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                style={selectStyle}
              />
            </div>
          );
        }

        if (typeof rawValue === 'string') {
          return (
            <div key={key} className="setting-group compact" style={{ margin: 0 }}>
              <label style={{ fontSize: '10px' }}>{key}</label>
              <input type="text" defaultValue={rawValue} 
                onBlur={e => onChange(key, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                style={{ width: '100%', padding: '2px', fontSize: '11px', background: 'var(--bg-medium)', color: '#fff', border: '1px solid var(--border-color)' }}
              />
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
}

function ChannelWorkspaceCard({ dsIdx, cIdx, channel }: { dsIdx: number, cIdx: number, channel: any }) {
  const { toast } = useToast();
  const [squelch, setSquelch] = useState<number>(-50);
  const [gain, setGain] = useState<number>(2);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{name: string, path: string, status: 'uploading' | 'done'} | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // ── File path state (synced from backend so play button works after reload) ─
  const [tsFilePath, setTsFilePath] = useState<string>('');

  // Detect plugin type from channelType
  const channelId: string = channel.id || channel.channelType || '';
  const isTx = channel.direction === 1;
  const isDatv = channelId.includes('DATVMod');
  const isAtv  = channelId.includes('ATVMod');
  const supportsUpload = isTx && (isDatv || isAtv || channelId.includes('FileSource'));
  const isDatvDemod = !isTx && (
    channelId.includes('DATVDemod') || channelId.includes('ATVDemod')
  );

  // ── SDRangel field names differ between DATVMod and ATVMod ───────────────────
  const fileNameField  = isDatv ? 'tsFileName'    : 'videoFileName';
  const playField      = isDatv ? 'tsFilePlay'    : 'videoPlay';
  const loopField      = isDatv ? 'tsFilePlayLoop' : 'videoPlayLoop';
  const srcField       = isDatv ? 'tsSource'      : 'atvModInput'; // 1 = File (DATV), 2 = Video (ATV)
  const srcVal         = isDatv ? 1 : 2;

  // ── Sync file path, play, and loop state from backend on mount ─
  useEffect(() => {
    if (!supportsUpload) return;
    const syncFilePath = async () => {
      // Small delay to let SDRangel finish initializing the channel.
      // Hitting getChannelSettings() on a partially-initialized channel segfaults.
      await new Promise(r => setTimeout(r, 1500));
      try {
        const s = await SdrService.getChannelSettings(dsIdx, cIdx);
        const key = Object.keys(s).find(k => k.endsWith('Settings'));
        if (!key) return;
        const filePath: string = s[key][fileNameField] || '';
        if (filePath) {
          setTsFilePath(filePath);
          setUploadStatus({ name: filePath.split('/').pop() || filePath, path: filePath, status: 'done' });
        }
        if (s[key][playField] !== undefined) {
          setIsPlaying(s[key][playField] === 1);
        }
        if (s[key][loopField] !== undefined) {
          setIsLooping(s[key][loopField] === 1);
        }
      } catch { /* backend may not be ready */ }
    };
    syncFilePath();
  }, [dsIdx, cIdx, supportsUpload, fileNameField, playField, loopField]);

  // ── Helper: tell SDRangel to load a file at the given absolute path ───────────
  const applyFileToSDRangel = async (filePath: string) => {
    const current = await SdrService.getChannelSettings(dsIdx, cIdx);
    const key = Object.keys(current).find(k => k.endsWith('Settings'));
    if (!key) throw new Error('Settings key not found');

    const base = { channelType: current.channelType, direction: current.direction };

    // Just patch the file name directly. This exactly replicates the native UI 
    // where setting the filename pushes MsgConfigureTsFileName without changing tsSource or clearing the path.
    await SdrService.patchChannelSettings(dsIdx, cIdx, {
      ...base,
      [key]: { [fileNameField]: filePath },
    });
  };

  // ── Open native file picker (zenity) and set path directly — no file copy ─────
  const handleUploadClick = async () => {
    try {
      const res = await fetch('/api/browse', { method: 'POST' });
      const data = await res.json();
      if (data.cancelled || !data.path) return;
      const selectedPath: string = data.path;
      const name = selectedPath.split('/').pop() || selectedPath;
      setTsFilePath(selectedPath);
      setUploadStatus({ name, path: selectedPath, status: 'done' });
      toast(`Setting file: ${name}…`, 'info');
      await applyFileToSDRangel(selectedPath);
      toast(`✔ File loaded: ${name}`, 'success');
    } catch (e: any) {
      toast(`Failed to set file in SDRangel: ${e?.message ?? ''}`, 'error');
    }
  };

  // ── Browser-upload fallback (triggered only when zenity is unavailable) ────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus({ name: file.name, path: '', status: 'uploading' });
    toast(`Uploading ${file.name}…`, 'info');
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-file-name': encodeURIComponent(file.name), 'Content-Type': 'application/octet-stream' },
        body: file,
      });
      if (!response.ok) throw new Error('Upload failed');
      const { path: savedPath } = await response.json();
      setUploadStatus({ name: file.name, path: savedPath, status: 'done' });
      setTsFilePath(savedPath);
      toast(`Upload complete, loading file…`, 'info');
      await applyFileToSDRangel(savedPath);
      toast(`✔ File loaded: ${file.name}`, 'success');
    } catch (e: any) {
      toast(`Failed: ${e?.message ?? 'upload error'}`, 'error');
      setUploadStatus(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePlayToggle = async () => {
    const next = !isPlaying;
    setIsPlaying(next);
    try {
      const current = await SdrService.getChannelSettings(dsIdx, cIdx);
      const key = Object.keys(current).find(k => k.endsWith('Settings'));
      if (!key) throw new Error('No settings key');
      await SdrService.patchChannelSettings(dsIdx, cIdx, {
        channelType: current.channelType,
        direction: current.direction,
        [key]: { [playField]: next ? 1 : 0 },
      });
    } catch { toast('Failed to toggle play state', 'error'); setIsPlaying(!next); }
  };

  const handleLoopToggle = async () => {
    const next = !isLooping;
    setIsLooping(next);
    try {
      const current = await SdrService.getChannelSettings(dsIdx, cIdx);
      const key = Object.keys(current).find(k => k.endsWith('Settings'));
      if (!key) throw new Error('No settings key');
      await SdrService.patchChannelSettings(dsIdx, cIdx, {
        channelType: current.channelType,
        direction: current.direction,
        [key]: { [loopField]: next ? 1 : 0 },
      });
    } catch { toast('Failed to toggle loop state', 'error'); setIsLooping(!next); }
  };

  const handleClose = async () => {
    try {
      await SdrService.deleteChannel(dsIdx, cIdx);
      toast(`${channel.title} removed`, "info");
    } catch (e) {
      toast("Failed to remove channel workspace", "error");
    }
  };

  const patchChannelSetting = async (field: string, value: number) => {
    try {
      const current = await SdrService.getChannelSettings(dsIdx, cIdx);
      const settingsKey = Object.keys(current).find(k => k.endsWith('Settings'));
      if (!settingsKey) throw new Error('No settings key found');
      // IMPORTANT: Send only the changed field in a minimal-key payload.
      // SDRangel uses key presence to decide what to apply. Spreading ALL settings
      // causes it to re-trigger tsFileName (reopening/resetting the file stream)
      // and tsFilePlay (toggling playback) on every unrelated settings change.
      const merged = {
        channelType: current.channelType,
        direction: current.direction,
        [settingsKey]: { [field]: value },
      };
      await SdrService.patchChannelSettings(dsIdx, cIdx, merged);
    } catch (e: any) {
      toast(`Failed to update ${field}: ${e?.message ?? 'API error'}`, 'error');
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [fullSettings, setFullSettings] = useState<any>(null);
  const [settingsKey, setSettingsKey] = useState<string>('');

  const toggleExpand = async () => {
    if (isExpanded) { setIsExpanded(false); return; }
    try {
      const current = await SdrService.getChannelSettings(dsIdx, cIdx);
      const key = Object.keys(current).find(k => k.endsWith('Settings'));
      if (key && current[key]) { setSettingsKey(key); setFullSettings(current[key]); setIsExpanded(true); }
      else toast("No expanded settings available for this plugin", "info");
    } catch { toast("Failed to load channel plugin settings", "error"); }
  };

  const handleDynamicChange = async (field: string, value: any) => {
    if (!settingsKey || !fullSettings) return;
    try {
      setFullSettings((prev: any) => ({ ...prev, [field]: value }));
      const current = await SdrService.getChannelSettings(dsIdx, cIdx);
      // Minimal-key payload: only send the changed field to avoid
      // accidentally re-triggering file open or play state changes.
      const merged = {
        channelType: current.channelType,
        direction: current.direction,
        [settingsKey]: { [field]: value },
      };
      await SdrService.patchChannelSettings(dsIdx, cIdx, merged);
    } catch (e: any) { toast(`Failed to update ${field}: ${e?.message ?? 'API error'}`, 'error'); }
  };

  const openHelp = () => window.open(`https://github.com/f4exb/sdrangel/wiki/${channel.id}`, '_blank');

  return (
    <div className="channel-card">
      <div className="channel-header" style={{ background: isTx ? 'rgba(255, 71, 87, 0.2)' : 'rgba(46, 213, 115, 0.2)' }}>
        <span style={{ fontWeight: 600 }}>
          {isTx ? 'T' : 'R'}:{dsIdx};{cIdx} &nbsp;
          <span style={{ color: '#eee' }}>{channel.title}</span>
        </span>
        <div className="navbar-group">
          <button className="sdr-btn" title="Toggle Plugin Settings" onClick={toggleExpand}>{isExpanded ? '▲' : '▼'}</button>
          <button className="sdr-btn" title="Open plugin docs" onClick={openHelp}>❔</button>
          <button className="sdr-btn" title="Close" onClick={handleClose}>✖</button>
        </div>
      </div>

      <div className="channel-body">
        <div className="freq-display-box" style={{ padding: '4px' }}>
          <span style={{ fontSize: '11px', color: '#aaa', alignSelf: 'center' }}>Δf Offset (Hz)</span>
          <input type="number" className="freq-number" style={{ fontSize: '14px', width: '100px', marginLeft: 'auto' }}
            defaultValue={channel.deltaFrequency}
            onBlur={e => patchChannelSetting('inputFrequencyOffset', parseInt(e.target.value))}
          />
        </div>

        {!isTx && (
          <div className="setting-group" style={{ marginTop: '4px' }}>
            <label>Audio Squelch ({squelch} dB)</label>
            <input type="range" min="-100" max="0" value={squelch}
              onChange={e => setSquelch(Number(e.target.value))}
              onMouseUp={() => patchChannelSetting('squelch', squelch)} />
          </div>
        )}

        <div className="setting-group" style={{ marginTop: isTx ? '4px' : '0' }}>
          <label>{isTx ? 'Input Gain' : 'Gain (Volume)'} ({gain})</label>
          <input type="range" min="0" max="10" value={gain}
            onChange={e => setGain(Number(e.target.value))}
            onMouseUp={() => patchChannelSetting(isTx ? 'inputVolumeFactor' : 'volume', gain)} />
        </div>

        {/* ── Upload Media + Playback Controls (DATVMod / ATVMod) ── */}
        {supportsUpload && (
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '6px 6px 4px' }}>
            {/* Row 1: file picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }}
                accept=".raw,.wav,.sdriq,.ts,.mp4,.mpg,.mpeg,.mkv,.avi"
                onChange={handleFileChange} />
              <button title="Select & upload media file" onClick={handleUploadClick}
                style={{
                  background: 'rgba(40,40,60,0.8)', border: '1px solid #444', color: '#ccc',
                  borderRadius: '4px', padding: '3px 8px', fontSize: '16px', cursor: 'pointer',
                  lineHeight: 1, display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                🎞
              </button>
              <span style={{
                flex: 1, fontSize: '10px',
                color: uploadStatus
                  ? (uploadStatus.status === 'uploading' ? '#ffeb3b' : '#2ed573')
                  : (tsFilePath ? '#2ed573' : '#555'),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {uploadStatus
                  ? (uploadStatus.status === 'uploading' ? '⏳ uploading…' : uploadStatus.name)
                  : (tsFilePath ? tsFilePath.split('/').pop() : '…')}
              </span>
            </div>

            {/* Row 2: Play + Loop */}
            {/* Enabled when file path is known — either from a fresh upload OR synced from backend on load */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button
                title={isPlaying ? 'Pause' : 'Play'}
                onClick={handlePlayToggle}
                disabled={!tsFilePath && (!uploadStatus || uploadStatus.status === 'uploading')}
                style={{
                  background: isPlaying ? 'rgba(46,213,115,0.25)' : 'rgba(40,40,60,0.8)',
                  border: `1px solid ${isPlaying ? '#2ed573' : '#444'}`,
                  color: isPlaying ? '#2ed573' : '#aaa',
                  borderRadius: '4px', padding: '3px 10px', fontSize: '14px', cursor: 'pointer',
                  opacity: (!tsFilePath && (!uploadStatus || uploadStatus.status === 'uploading')) ? 0.4 : 1,
                }}>
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button
                title={isLooping ? 'Disable loop' : 'Enable loop'}
                onClick={handleLoopToggle}
                disabled={!tsFilePath && (!uploadStatus || uploadStatus.status === 'uploading')}
                style={{
                  background: isLooping ? 'rgba(52,152,219,0.25)' : 'rgba(40,40,60,0.8)',
                  border: `1px solid ${isLooping ? '#3498db' : '#444'}`,
                  color: isLooping ? '#3498db' : '#aaa',
                  borderRadius: '4px', padding: '3px 10px', fontSize: '14px', cursor: 'pointer',
                  opacity: (!tsFilePath && (!uploadStatus || uploadStatus.status === 'uploading')) ? 0.4 : 1,
                }}>
                🔁
              </button>

              {tsFilePath && (
                <span
                  title={tsFilePath}
                  style={{ fontSize: '9px', color: '#2ed573', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {tsFilePath.split('/').pop()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── DATV Modulator Specific Controls ── */}

        {/* ── DATV Modulator Specific Controls ── */}
        {isDatv && (
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '6px 6px 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Row 1: Symbol Rate & BW */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="setting-group compact" style={{ margin: 0, flex: 1 }}>
                <label style={{ fontSize: '10px' }}>Symbols/s</label>
                <input type="number" defaultValue={fullSettings?.symbolRate ?? 250000} 
                  onBlur={e => patchChannelSetting('symbolRate', Number(e.target.value))}
                  onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  style={{ width: '100%', padding: '2px', fontSize: '11px', background: 'var(--bg-medium)', color: '#fff', border: '1px solid var(--border-color)' }} />
              </div>
              <div className="setting-group compact" style={{ margin: 0, flex: 1 }}>
                <label style={{ fontSize: '10px' }}>BW (kHz)</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input type="range" min="1" max="5000" defaultValue={fullSettings?.rfBandwidth ? fullSettings.rfBandwidth / 1000 : 1000} 
                    onChange={e => e.currentTarget.nextElementSibling!.textContent = `${e.target.value}kHz`}
                    onMouseUp={e => patchChannelSetting('rfBandwidth', Number(e.currentTarget.value) * 1000)}
                    style={{ flex: 1 }} />
                  <span style={{ fontSize: '10px', minWidth: '45px', textAlign: 'right' }}>
                    {fullSettings?.rfBandwidth ? fullSettings.rfBandwidth / 1000 : 1000}kHz
                  </span>
                </div>
              </div>
            </div>
            
            {/* Row 2: Modulation & FEC */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="setting-group compact" style={{ margin: 0, flex: 1 }}>
                <label style={{ fontSize: '10px' }}>Modulation</label>
                <select defaultValue={fullSettings?.modulation ?? 1} onChange={e => patchChannelSetting('modulation', Number(e.target.value))}
                  style={{ width: '100%', padding: '2px', fontSize: '11px', background: 'var(--bg-medium)', color: '#fff', border: '1px solid var(--border-color)' }}>
                  <option value={0}>BPSK</option>
                  <option value={1}>QPSK</option>
                  <option value={2}>8PSK</option>
                  <option value={3}>16APSK</option>
                  <option value={4}>32APSK</option>
                </select>
              </div>
              <div className="setting-group compact" style={{ margin: 0, flex: 1 }}>
                <label style={{ fontSize: '10px' }}>FEC</label>
                <select defaultValue={fullSettings?.fec ?? 0} onChange={e => patchChannelSetting('fec', Number(e.target.value))}
                  style={{ width: '100%', padding: '2px', fontSize: '11px', background: 'var(--bg-medium)', color: '#fff', border: '1px solid var(--border-color)' }}>
                  <option value={0}>1/2</option>
                  <option value={1}>2/3</option>
                  <option value={2}>3/4</option>
                  <option value={3}>5/6</option>
                  <option value={4}>7/8</option>
                  <option value={5}>4/5</option>
                  <option value={6}>8/9</option>
                  <option value={7}>9/10</option>
                </select>
              </div>
            </div>

            {/* Row 3: UDP Address & Port */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="setting-group compact" style={{ margin: 0, flex: 1 }}>
                <label style={{ fontSize: '10px' }}>UDP Address</label>
                <input type="text" defaultValue={fullSettings?.udpAddress ?? '127.0.0.1'} 
                  onBlur={e => patchChannelSetting('udpAddress', e.target.value as any)}
                  onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  style={{ width: '100%', padding: '2px', fontSize: '11px', background: 'var(--bg-medium)', color: '#fff', border: '1px solid var(--border-color)' }} />
              </div>
              <div className="setting-group compact" style={{ margin: 0, flex: 1 }}>
                <label style={{ fontSize: '10px' }}>UDP Port</label>
                <input type="number" defaultValue={fullSettings?.udpPort ?? 5004} 
                  onBlur={e => patchChannelSetting('udpPort', Number(e.target.value))}
                  onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  style={{ width: '100%', padding: '2px', fontSize: '11px', background: 'var(--bg-medium)', color: '#fff', border: '1px solid var(--border-color)' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── DATV / ATV Demodulator output panel ────────────────── */}
        {isDatvDemod && (
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '6px 4px' }}>
            {/* Received video area */}
            <div style={{
              background: '#000', borderRadius: '4px', width: '100%', height: '110px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #2a2a3a', marginBottom: '6px', position: 'relative',
            }}>
              <span style={{ fontSize: '10px', color: '#444' }}>📡 Waiting for DVB-S stream…</span>
              <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: '9px', color: '#555', display: 'flex', gap: '10px' }}>
                <span>MER –</span><span>CNR –</span><span>0 kb/s</span>
              </div>
            </div>
            {/* Constellation */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '9px', color: '#666', marginBottom: '3px' }}>Constellation</div>
                <canvas width={80} height={80}
                  style={{ background: '#080810', borderRadius: '4px', border: '1px solid #2a2a3a', display: 'block' }}
                  ref={canvas => {
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    ctx.clearRect(0, 0, 80, 80);
                    // Draw axes
                    ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, 80); ctx.moveTo(0, 40); ctx.lineTo(80, 40); ctx.stroke();
                    // QPSK placeholder dots
                    ctx.fillStyle = '#2ed573';
                    [[20,20],[60,20],[20,60],[60,60]].forEach(([cx,cy]) => {
                      for (let i = 0; i < 14; i++) {
                        ctx.beginPath();
                        ctx.arc(cx + (Math.random()-0.5)*7, cy + (Math.random()-0.5)*7, 1.2, 0, Math.PI*2);
                        ctx.fill();
                      }
                    });
                  }}
                />
              </div>
              <div style={{ fontSize: '9px', color: '#555', lineHeight: 2 }}>
                <div>Mode: QPSK</div>
                <div>Std: DVB-S</div>
                <div>FEC: 1/2</div>
                <div>SR: –</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="spectrum-toolbar" style={{ borderTop: '1px solid var(--border-color)', marginTop: 'auto', padding: '4px' }}>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#999', alignSelf: 'center' }}>
          CF: {(channel.deltaFrequency || 0).toLocaleString()} Hz
        </span>
      </div>

      {isExpanded && fullSettings && (
        <DynamicSettingsEditor settings={fullSettings} onChange={handleDynamicChange} />
      )}
    </div>
  );
}



function MechanicalDisplay({ value, digits, color = 'orange', suffix = '', onUpdate }: { value: number, digits: number, color?: 'orange'|'green', suffix?: string, onUpdate?: (val: number) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(value.toString());

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input 
          autoFocus
          className="freq-number"
          style={{ width: `${digits * 12}px`, fontSize: '18px', padding: '2px', background: '#111', color: '#fff', border: '1px solid #444', outline: 'none', textAlign: 'right' }}
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={() => {
            setIsEditing(false);
            if (onUpdate && !isNaN(Number(editVal))) onUpdate(Number(editVal));
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setIsEditing(false);
              if (onUpdate && !isNaN(Number(editVal))) onUpdate(Number(editVal));
            } else if (e.key === 'Escape') {
              setIsEditing(false);
              setEditVal(value.toString());
            }
          }}
        />
        {suffix && <span style={{ fontSize: '14px', color: '#ccc' }}>{suffix}</span>}
      </div>
    );
  }

  const str = value.toString().padStart(digits, '0');
  const blocks = [];
  for (let i = 0; i < str.length; i++) {
    blocks.push(<div key={i} className={`digit ${color === 'green' ? 'green' : ''}`}>{str[i]}</div>);
    if ((str.length - 1 - i) % 3 === 0 && i !== str.length - 1) {
      blocks.push(<div key={`comma-${i}`} className="digit-separator">,</div>);
    }
  }
  return (
    <div 
      style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: onUpdate ? 'pointer' : 'default' }}
      onClick={() => {
        if (onUpdate) {
          setEditVal(value.toString());
          setIsEditing(true);
        }
      }}
      title={onUpdate ? "Click to edit" : undefined}
    >
      <div className="digit-display">{blocks}</div>
      {suffix && <span style={{ fontSize: '14px', color: '#ccc' }}>{suffix}</span>}
    </div>
  );
}

function DeviceSidebarCard({ idx, ds, onAddChannel }: { idx: number, ds: DeviceSet, onAddChannel: () => void }) {
  const [hwSettings, setHwSettings] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const hw = ds.samplingDevice;
  const [optimisticState, setOptimisticState] = useState<string | null>(null);

  const isRunning = optimisticState !== null
    ? optimisticState === 'running'
    : (hw?.state === 1 || hw?.state === 'running');

  useEffect(() => {
    if (hw?.state === optimisticState) setOptimisticState(null);
  }, [hw?.state, optimisticState]);

  useEffect(() => {
    const fetchHw = async () => {
      try {
        const fullSettings = await SdrService.getDeviceSettings(idx);
        const key = Object.keys(fullSettings).find(k => k.endsWith('Settings'));
        if (key) setHwSettings(fullSettings[key]);
      } catch (e) { }
    };
    fetchHw();
    const inv = setInterval(fetchHw, 3000);
    return () => clearInterval(inv);
  }, [idx]);

  const patchSetting = async (field: string, value: number | string) => {
    try {
      const fullSettings = await SdrService.getDeviceSettings(idx);
      const hwKey = Object.keys(fullSettings).find(k => k.endsWith('Settings'));
      if (hwKey && fullSettings[hwKey]) {
        fullSettings[hwKey][field] = value;
        await SdrService.patchDeviceSettings(idx, fullSettings);
        setHwSettings(fullSettings[hwKey]);
      }
    } catch (e) {
      toast(`Failed to set hardware setting ${field}`, "error");
    }
  };

  const handlePowerDrop = async () => {
    const targetState = isRunning ? 0 : 1;
    setOptimisticState(targetState ? 'running' : 'idle');
    try {
      await SdrService.setDeviceState(idx, targetState);
      // Give SDRangel 2s to fully initialize or tear down the DSP engine.
      // Polling the API during this transition window causes segfaults.
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      setOptimisticState(null);
      toast("Failed to toggle DSP engine state", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await SdrService.deleteDeviceSet();
    } catch (e) {
      toast("Failed to close workspace", "error");
    }
  };



  return (
    <div className="native-panel">
      {/* HEADER: T:0, gears, play button, name */}
      <div className="native-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ background: '#d32f2f', color: '#fff', padding: '0 4px', fontSize: '12px', fontWeight: 'bold' }}>T:{idx}</div>
          <button className="run-btn" title="Settings" onClick={() => setIsExpanded(!isExpanded)} style={{ fontSize: '14px', background: isExpanded ? 'rgba(255,255,255,0.2)' : 'transparent' }}>⚙</button>
          <button className="run-btn" title="Toggle Run" onClick={handlePowerDrop} style={{ background: isRunning ? '#5a7dcf' : '#6e6e6e' }}>
            {isRunning ? '▶' : '▶'}
          </button>
          <span style={{ fontSize: '13px', marginLeft: '4px' }}>{hw?.displayedName || hw?.hwType || `Device ${idx}`}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button className="run-btn" title="Help" style={{ borderRadius: '50%', fontSize: '11px', width: '18px', height: '18px' }}>?</button>
          <button className="run-btn" title="Add Channel" onClick={onAddChannel}>+</button>
          <button className="run-btn" title="Close" style={{ fontSize: '12px' }} onClick={handleDelete}>✕</button>
        </div>
      </div>

      {/* FREQUENCY ROW */}
      <div className="native-row" style={{ padding: '8px', justifyContent: 'center' }}>
        <MechanicalDisplay 
          value={Math.floor((hwSettings?.centerFrequency || hw?.centerFrequency || 435000000) / 1000)} 
          digits={7} color="orange" suffix="kHz" 
          onUpdate={val => patchSetting('centerFrequency', val * 1000)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto' }}>
          <span className="native-label">#0</span>
          <span className="native-label">3000k</span>
        </div>
      </div>

      {/* ANTENNA / CLOCK ROW */}
      <div className="native-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '18px', margin: '0 4px' }}>⹓</span>
          <select className="native-select">
            <option>TX/RX</option>
          </select>
          <button className="run-btn" style={{ fontSize: '11px', width: '20px', height: '20px' }}>X</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="native-label">Clock</span>
          <select className="native-select"><option>internal</option></select>
        </div>
      </div>

      {/* SAMPLE RATE ROW */}
      <div className="native-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="native-label" style={{ fontWeight: 'bold' }}>SR</span>
          <MechanicalDisplay 
            value={hwSettings?.devSampleRate || hw?.devSampleRate || 3000000} 
            digits={8} color="green" suffix="S/s" 
            onUpdate={val => patchSetting('devSampleRate', val)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="native-label">Int</span>
          <select className="native-select"><option>1</option></select>
        </div>
      </div>

      {/* GAIN ROW */}
      <div className="native-row">
        <span className="native-label">Gain</span>
        <div className="native-slider-container">
          <input type="range" className="native-slider" min="0" max="89" defaultValue={hwSettings?.txGain || hwSettings?.gain || 50} onMouseUp={e=>patchSetting(hwSettings?.txGain !== undefined ? 'txGain' : 'gain', Number((e.target as HTMLInputElement).value))} />
        </div>
        <span className="native-label">{hwSettings?.txGain || hwSettings?.gain || 50}dB</span>
      </div>

      {/* LPF / LO ROW */}
      <div className="native-row" style={{ justifyContent: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="native-label">LPF</span>
          <MechanicalDisplay 
            value={hwSettings?.lpfBW !== undefined ? Math.floor(hwSettings.lpfBW / 1000) : 10000} 
            digits={5} color="orange" suffix="kHz" 
            onUpdate={hwSettings?.lpfBW !== undefined ? (val => patchSetting('lpfBW', val * 1000)) : undefined}
          />
        </div>
        <div style={{ width: '1px', height: '24px', background: '#222', borderRight: '1px solid #444' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="native-label">LO</span>
          <span style={{ color: '#f39c12', fontSize: '16px', fontWeight: 'bold' }}>+</span>
          <MechanicalDisplay 
            value={hwSettings?.LOOffset !== undefined ? Math.floor(hwSettings.LOOffset / 1000) : 0} 
            digits={6} color="orange" suffix="kHz" 
            onUpdate={hwSettings?.LOOffset !== undefined ? (val => patchSetting('LOOffset', val * 1000)) : undefined}
          />
        </div>
      </div>

      {/* DYNAMIC SETTINGS */}
      {isExpanded && hwSettings && (
        <DynamicSettingsEditor settings={hwSettings} onChange={patchSetting} />
      )}
    </div>
  );
}

function MediaPlayerPanel({ deviceSets }: { deviceSets: DeviceSet[] }) {
  // Find the DATV channel's file path from any TX device set
  const [filePath, setFilePath] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedPath, setOptimizedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setOptimizedPath(null);
      return;
    }
    if (filePath.toLowerCase().endsWith('_web.mp4')) {
      setOptimizedPath(filePath);
      return;
    }
    const checkOptimized = async () => {
      try {
        const potentialPath = filePath.replace(/\.[^/.]+$/, "") + '_web.mp4';
        const res = await fetch(`/api/stat?path=${encodeURIComponent(potentialPath)}`);
        const data = await res.json();
        if (data.exists) {
          setOptimizedPath(potentialPath);
        } else {
          setOptimizedPath(null);
        }
      } catch (e) {
        setOptimizedPath(null);
      }
    };
    checkOptimized();
  }, [filePath]);

  useEffect(() => {
    const txSets = deviceSets.filter(ds => ds.samplingDevice?.direction === 1);
    if (txSets.length === 0) return;
    // Try to find a DATV channel with a file loaded
    const trySync = async () => {
      for (let i = 0; i < deviceSets.length; i++) {
        const chs = deviceSets[i].channels || [];
        for (let c = 0; c < chs.length; c++) {
          if ((chs[c].id || chs[c].channelType || '').includes('DATVMod')) {
            try {
              const s = await SdrService.getChannelSettings(i, c);
              const key = Object.keys(s).find(k => k.endsWith('Settings'));
              if (key && s[key].tsFileName) {
                setFilePath(s[key].tsFileName);
                setIsPlaying(!!(s[key].tsFilePlay));
              }
            } catch { /* ignore */ }
          }
        }
      }
    };
    trySync();
    const id = setInterval(trySync, 3000);
    return () => clearInterval(id);
  }, [deviceSets]);

  const fileName = filePath ? filePath.split('/').pop() : null;

  const openSystemVideo = async () => {
    if (!filePath) return;
    try {
      await fetch('/api/open-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
    } catch (e) {
      console.error("Failed to open system video:", e);
    }
  };

  const handleOptimize = async () => {
    if (!filePath) return;
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/transcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      const data = await res.json();
      if (data.ok && data.optimizedPath) {
        setOptimizedPath(data.optimizedPath);
      } else {
        alert("Optimization failed: " + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert("Failed to request optimization.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div style={{
      flex: 1, height: '100%',
      background: 'linear-gradient(180deg,#0c0e13 0%,#090b10 100%)',
      borderTop: '1px solid rgba(255,140,0,0.25)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg,rgba(255,140,0,0.12),transparent)',
        borderBottom: '1px solid rgba(255,140,0,0.15)',
        padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
      }}>
        <span style={{ background: 'rgba(255,140,0,0.18)', color: '#ff8c00', fontWeight: 800, fontSize: '9px', padding: '2px 7px', borderRadius: '3px', border: '1px solid rgba(255,140,0,0.35)', letterSpacing: '0.1em' }}>MEDIA</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#ddd' }}>Attached Video Playback</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: isPlaying ? '#2ed573' : '#555', fontWeight: 700 }}>
          {isPlaying ? '● TRANSMITTING' : '○ IDLE'}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '20px', padding: '10px 20px', minHeight: 0 }}>
        {/* Video Player Area */}
        <div style={{
          flex: 1, height: '100%',
          background: '#000', border: '1px solid rgba(255,140,0,0.15)',
          borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {optimizedPath ? (
            <video 
              controls 
              autoPlay
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              src={`/api/stream?path=${encodeURIComponent(optimizedPath)}`} 
            />
          ) : filePath ? (
            <TsPlayer filePath={filePath} />
          ) : (
            <div style={{ color: '#444', fontSize: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>▶</div>
              <div>No Video Loaded</div>
            </div>
          )}
          <div style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '9px', color: '#555', fontFamily: 'JetBrains Mono,monospace', zIndex: 10, textShadow: '0 0 4px #000', pointerEvents: 'none' }}>
            {isPlaying ? 'LIVE TX' : 'STANDBY'}
          </div>
        </div>

        {/* File info */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Transport Stream File</div>
              <div style={{
                fontSize: '15px', fontWeight: 700, color: fileName ? '#e0e0e0' : '#444',
                fontFamily: 'JetBrains Mono,monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {fileName || '— no file loaded —'}
              </div>
              {filePath && (
                <div style={{ fontSize: '9px', color: '#3a3', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={filePath}>
                  {filePath}
                </div>
              )}
            </div>
          </div>
          
          {filePath && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!optimizedPath && (
                <button onClick={handleOptimize} disabled={isOptimizing} style={{
                  background: isOptimizing ? 'rgba(52, 152, 219, 0.1)' : 'rgba(46, 213, 115, 0.1)', 
                  border: `1px solid ${isOptimizing ? 'rgba(52, 152, 219, 0.3)' : 'rgba(46, 213, 115, 0.3)'}`,
                  color: isOptimizing ? '#3498db' : '#2ed573', 
                  padding: '8px 12px', borderRadius: '4px', cursor: isOptimizing ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  <span style={{ fontSize: '14px' }}>{isOptimizing ? '⏳' : '⚡'}</span> 
                  {isOptimizing ? 'Optimizing (this may take a minute)...' : 'Optimize for Web (H.264)'}
                </button>
              )}
              <button onClick={openSystemVideo} style={{
                background: 'rgba(255, 140, 0, 0.1)', border: '1px solid rgba(255, 140, 0, 0.3)',
                color: '#ff8c00', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '600',
                transition: 'all 0.2s'
              }}>
                <span style={{ fontSize: '14px' }}>📺</span> Open in System Player (Fallback)
              </button>
            </div>
          )}

          {/* Status badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'FORMAT', value: fileName?.endsWith('.ts') ? 'MPEG-TS' : fileName ? 'MEDIA' : '—' },
              { label: 'STATUS', value: isPlaying ? 'PLAYING' : 'PAUSED', color: isPlaying ? '#2ed573' : '#666' },
              { label: 'MODE', value: 'DVB-S/S2' },
              { label: 'SOURCE', value: 'FILE' },
            ].map(b => (
              <div key={b.label} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '4px', padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: '1px',
              }}>
                <span style={{ fontSize: '8px', color: '#555', letterSpacing: '0.1em' }}>{b.label}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: b.color || '#ccc', fontFamily: 'JetBrains Mono,monospace' }}>{b.value}</span>
              </div>
            ))}
          </div>

          {!filePath && (
            <div style={{ fontSize: '11px', color: '#444', lineHeight: 1.6 }}>
              Upload a <code style={{ color: '#ff8c00', background: 'rgba(255,140,0,0.1)', padding: '1px 5px', borderRadius: '3px' }}>.ts</code> file in the DATV Modulator panel to begin transmission.
            </div>
          )}
        </div>

        {/* Transmission indicator */}
        <div style={{
          width: '80px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: isPlaying ? 'radial-gradient(circle,rgba(46,213,115,0.3),rgba(46,213,115,0.05))' : 'radial-gradient(circle,rgba(255,255,255,0.05),rgba(0,0,0,0))',
            border: `2px solid ${isPlaying ? 'rgba(46,213,115,0.6)' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isPlaying ? '0 0 20px rgba(46,213,115,0.2)' : 'none',
            transition: 'all 0.4s ease',
          }}>
            <span style={{ fontSize: '18px' }}>{isPlaying ? '📡' : '📻'}</span>
          </div>
          <span style={{ fontSize: '9px', color: isPlaying ? '#2ed573' : '#444', fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center' }}>
            {isPlaying ? 'TX ACTIVE' : 'NO SIGNAL'}
          </span>
        </div>
      </div>
    </div>
  );
}

function SdrApplication() {
  const [deviceSets, setDeviceSets] = useState<DeviceSet[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [hasNotifiedOffline, setHasNotifiedOffline] = useState(false);

  // Modal / sidebar visibility
  const [registryTarget, setRegistryTarget] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [activeTab, setActiveTab] = useState<'device' | 'plugins' | 'video'>('device');
  const [deviceSelection, setDeviceSelection] = useState<{ direction: 0 | 1 } | null>(null);

  const { toast } = useToast();

  // ── TX-only filter: dashboard is solely devoted to transmitters ──
  // Keep the original deviceSets for correct API index resolution,
  // but only render TX device sets (direction === 1).
  const txDeviceSets = deviceSets
    .map((ds, idx) => ({ ds, idx }))
    .filter(({ ds }) => ds.samplingDevice?.direction === 1);

  useEffect(() => {
    const fetchSdrStatus = async () => {
      try {
        const [dsData] = await Promise.all([
          SdrService.getDeviceSets()
        ]);
        setDeviceSets(dsData?.deviceSets || []);
        if (!isConnected) {
          setIsConnected(true);
          setHasNotifiedOffline(false);
        }
      } catch (err) {
        if (!hasNotifiedOffline) {
          toast("SDRangel backend is unreachable. Start sdrsrv or the GUI with the API enabled.", "error");
          setHasNotifiedOffline(true);
        }
        setIsConnected(false);
      }
    };
    fetchSdrStatus();
    const interval = setInterval(fetchSdrStatus, 2000);
    return () => clearInterval(interval);
  }, [isConnected, hasNotifiedOffline, toast]);

  const handleApplyPlugin = async (pluginId: string) => {
    if (registryTarget === null) return;
    const direction = deviceSets[registryTarget]?.samplingDevice?.direction || 0;
    try {
      await SdrService.addChannel(registryTarget, pluginId, direction);
      // Give SDRangel 2s to fully initialize the new channel's baseband, pulse-shape
      // filters, etc. before the polling loops fire getChannelSettings(). Hitting the
      // API during this window crashes the C++ backend with a segfault.
      await new Promise(r => setTimeout(r, 2000));
      toast(`Successfully added ${pluginId} channel plugin`, "success" as any);
    } catch (e) {
      toast(`Failed to add plugin`, "error");
    } finally {
      setRegistryTarget(null);
    }
  };

  const handleConfirmSamplingDevice = async (hwDevice: any) => {
    if (!deviceSelection) return;
    const direction = deviceSelection.direction;
    const dirStr = direction === 0 ? "Rx" : "Tx";
    setDeviceSelection(null);

    try {
      await SdrService.createDeviceSet(direction);
      toast(`${dirStr} Workspace created`, "info");

      // Fetch fresh state to find the newly created workspace index
      const allSetsData = await SdrService.getDeviceSets().catch(() => null);
      if (allSetsData && allSetsData.deviceSets && allSetsData.deviceSets.length > 0) {
         const sets = allSetsData.deviceSets;
         // The newly created device set is the absolute last one appended
         const newSetIndex = sets.length - 1; 
         
         // Make sure to push the selected hardware direction alongside its identifier details
         await SdrService.attachDeviceHardware(newSetIndex, { ...hwDevice, direction });
         toast(`Attached sampling device: ${hwDevice.displayedName || hwDevice.hwType}`, "success");
      }
    } catch (e) {
      toast(`Failed to setup ${dirStr} workspace`, "error");
    }
  };

  return (
    <div className="sdr-app">

      {/* ── MAIN LAYOUT WITH SIDEBAR ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bg-dark)' }}>

        {/* ── TAB SIDEBAR ── */}
        <div style={{
          width: '240px', background: 'linear-gradient(180deg, #0d0f14 0%, #090a0c 100%)',
          borderRight: '1px solid rgba(255,140,0,0.2)', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '20px 24px', color: '#ff8c00', fontSize: '11px', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.05)', letterSpacing: '0.15em' }}>
            DASHBOARD VIEWS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '10px 0' }}>
            <button
              onClick={() => setActiveTab('device')}
              style={{
                padding: '16px 24px', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent',
                display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, transition: 'all 0.2s',
                color: activeTab === 'device' ? '#fff' : '#777',
                borderLeft: activeTab === 'device' ? '3px solid #ff8c00' : '3px solid transparent',
                backgroundColor: activeTab === 'device' ? 'rgba(255,140,0,0.08)' : 'transparent'
              }}
            >
              <span style={{ fontSize: '18px' }}>📡</span> Device Control
            </button>

            <button
              onClick={() => setActiveTab('plugins')}
              style={{
                padding: '16px 24px', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent',
                display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, transition: 'all 0.2s',
                color: activeTab === 'plugins' ? '#fff' : '#777',
                borderLeft: activeTab === 'plugins' ? '3px solid #ff8c00' : '3px solid transparent',
                backgroundColor: activeTab === 'plugins' ? 'rgba(255,140,0,0.08)' : 'transparent'
              }}
            >
              <span style={{ fontSize: '18px' }}>🔌</span> M-DATV Plugins
            </button>

            <button
              onClick={() => setActiveTab('video')}
              style={{
                padding: '16px 24px', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent',
                display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, transition: 'all 0.2s',
                color: activeTab === 'video' ? '#fff' : '#777',
                borderLeft: activeTab === 'video' ? '3px solid #ff8c00' : '3px solid transparent',
                backgroundColor: activeTab === 'video' ? 'rgba(255,140,0,0.08)' : 'transparent'
              }}
            >
              <span style={{ fontSize: '18px' }}>▶</span> Video Playback
            </button>
          </div>
        </div>

        {/* ── TAB CONTENT AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(160deg, #0d0f14 0%, #111318 60%, #0a0d11 100%)' }}>

          {activeTab === 'device' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(90deg,rgba(255,140,0,0.15),rgba(255,140,0,0.03))',
                borderBottom: '1px solid rgba(255,140,0,0.3)', padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#c0392b', color: '#fff', fontWeight: 800, fontSize: '10px', padding: '2px 7px', borderRadius: '3px', letterSpacing: '0.1em' }}>TX</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#e0e0e0', fontFamily: 'Inter,sans-serif' }}>Device Hardware Control</span>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {txDeviceSets.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: '#444' }}>
                    <div style={{ fontSize: '42px', marginBottom: '16px' }}>📡</div>
                    <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, marginBottom: '20px' }}>No TX device active.<br />Click the button below to add one.</div>
                    <button onClick={() => setDeviceSelection({ direction: 1 })} style={{
                      background: 'rgba(46, 213, 115, 0.15)', border: '1px solid rgba(46, 213, 115, 0.4)',
                      color: '#2ed573', borderRadius: '6px', padding: '8px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                    }}>✚ Add Tx Device</button>
                  </div>
                ) : (
                  <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                    {txDeviceSets.map(({ ds, idx }) => (
                      <DeviceSidebarCard key={idx} idx={idx} ds={ds} onAddChannel={() => setRegistryTarget(idx)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'plugins' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(90deg,rgba(255,140,0,0.12),rgba(255,140,0,0.02))',
                borderBottom: '1px solid rgba(255,140,0,0.25)', padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: 'rgba(255,140,0,0.2)', color: '#ff8c00', fontWeight: 800, fontSize: '10px', padding: '2px 7px', borderRadius: '3px', border: '1px solid rgba(255,140,0,0.4)', letterSpacing: '0.08em' }}>M-DATV</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#e0e0e0' }}>DATV Modulator Plugins</span>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {txDeviceSets.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: '#444' }}>
                    <div style={{ fontSize: '42px', marginBottom: '16px' }}>🔌</div>
                    <div style={{ fontSize: '14px', color: '#555' }}>Add a TX device first, then attach a DATV Modulator channel.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {txDeviceSets.map(({ ds, idx }) => {
                      const channels = (ds.channels || []).filter((ch: any) => ch.direction === 1);
                      if (channels.length === 0) return (
                        <div key={idx} style={{ padding: '32px 20px', textAlign: 'center', color: '#444', width: '100%', maxWidth: '400px' }}>
                          <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
                            No TX channel plugins on device {idx}.<br />
                            <button onClick={() => setRegistryTarget(idx)} style={{
                              marginTop: '12px', background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.4)',
                              color: '#ff8c00', borderRadius: '6px', padding: '6px 18px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                            }}>+ Add Channel Plugin</button>
                          </div>
                        </div>
                      );
                      return channels.map((ch: any, cIdx: number) => (
                        <div key={`${idx}-${cIdx}`} style={{ width: '400px' }}>
                          <ChannelWorkspaceCard dsIdx={idx} cIdx={cIdx} channel={ch} />
                        </div>
                      ));
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
              <MediaPlayerPanel deviceSets={deviceSets} />
            </div>
          )}

          {showFeatures && <FeatureSidebar onClose={() => setShowFeatures(false)} />}
        </div>
      </div>

      {/* Modals */}
      {registryTarget !== null && deviceSets[registryTarget] && (
        <PluginRegistryModal
          onClose={() => setRegistryTarget(null)}
          onApply={handleApplyPlugin}
          direction={deviceSets[registryTarget].samplingDevice?.direction || 0}
        />
      )}
      {showPresets && <PresetsModal onClose={() => setShowPresets(false)} deviceSetCount={deviceSets.length || 1} />}
      {showPreferences && <PreferencesModal onClose={() => setShowPreferences(false)} />}
      
      {deviceSelection && (
        <DeviceSelectionModal
          direction={deviceSelection.direction}
          onClose={() => setDeviceSelection(null)}
          onConfirm={handleConfirmSamplingDevice}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SdrApplication />
    </ToastProvider>
  );
}
