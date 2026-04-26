import { useState, useEffect, createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { SdrService } from './api';
import type { SdrChannelDef } from './api';
import { useSpectrumData } from './useSpectrumData';
import type { DataSource } from './useSpectrumData';
import './App.css';

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

function TopNavbar({ isConnected, onOpenPresets, onToggleFeatures, featuresOpen, onOpenPreferences, audioOutDevices }: {
  isConnected: boolean;
  onOpenPresets: () => void;
  onToggleFeatures: () => void;
  featuresOpen: boolean;
  onOpenPreferences: () => void;
  audioOutDevices: any[];
}) {
  const { toast } = useToast();
  const [deviceSelection, setDeviceSelection] = useState<{ direction: 0 | 1 } | null>(null);

  const activeAudio = audioOutDevices.find(d => d.isSystemDefault === 1) || audioOutDevices[0];

  const handleAudioChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    const targetDevice = audioOutDevices.find(d => d.index === idx);
    if (!targetDevice) return;
    try {
      await SdrService.patchAudioOutput({ ...targetDevice, isSystemDefault: 1 });
      toast(`Audio routed to ${targetDevice.name}`, 'success');
    } catch {
      toast('Failed to change audio output device', 'error');
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

  const handleCreateRx = () => setDeviceSelection({ direction: 0 });
  const handleCreateTx = () => setDeviceSelection({ direction: 1 });


  return (
    <div className="top-navbar">
      {/* Presets */}
      <div className="navbar-group">
        <button className="sdr-btn" title="Preset Manager" onClick={onOpenPresets}>⭐ Presets</button>
      </div>
      <div className="nav-divider"></div>

      {/* Device creation — Tx only */}
      <div className="navbar-group">
        <button className="sdr-btn success" title="Create new Tx (transmitter) workspace" onClick={handleCreateTx}>✚ Tx</button>
        <button
          className="sdr-btn"
          title="Toggle Feature Sidebar"
          style={{ color: featuresOpen ? '#9b59b6' : '#888', background: featuresOpen ? 'rgba(155,89,182,0.2)' : 'transparent' }}
          onClick={onToggleFeatures}
        >✚ Features</button>
      </div>

      <div className="nav-divider" style={{ margin: '0 16px' }}></div>

      {/* Audio Routing & Recording */}
      <div className="navbar-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#888' }}>🔊 Output:</span>
        <select
          value={activeAudio?.index ?? -1}
          onChange={handleAudioChange}
          style={{ background: 'var(--bg-medium)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '11px', padding: '4px', borderRadius: '4px', maxWidth: '160px' }}
        >
          {audioOutDevices.map(d => (
            <option key={d.index} value={d.index}>{d.name}</option>
          ))}
          {audioOutDevices.length === 0 && <option disabled value="-1">No Devices</option>}
        </select>
      </div>

      <div style={{ flex: 1 }}></div>

      {/* Status + Preferences */}
      <div className="navbar-group">
        <span style={{ fontSize: '12px', color: isConnected ? '#2ed573' : '#ff4757', marginRight: '10px' }}>
          {isConnected ? '🟢 API Connected' : '🔴 API Unreachable'}
        </span>
        <button className="sdr-btn" title="Open Settings" onClick={onOpenPreferences}>⚙️</button>
      </div>

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

  // ── Sync file path from backend on mount so play button works after page reload ─
  // NOTE: We intentionally do NOT sync isPlaying/isLooping here. Syncing those
  // caused a critical bug: if the backend was already playing, the frontend
  // would show ⏸ instead of ▶, so clicking ▶ would send tsFilePlay=0 (pause).
  useEffect(() => {
    if (!supportsUpload) return;
    const syncFilePath = async () => {
      try {
        const s = await SdrService.getChannelSettings(dsIdx, cIdx);
        const key = Object.keys(s).find(k => k.endsWith('Settings'));
        if (!key) return;
        const filePath: string = s[key][fileNameField] || '';
        if (filePath) {
          setTsFilePath(filePath);
          setUploadStatus({ name: filePath.split('/').pop() || filePath, path: filePath, status: 'done' });
        }
      } catch { /* backend may not be ready */ }
    };
    syncFilePath();
  }, [dsIdx, cIdx, supportsUpload]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus({ name: file.name, path: '', status: 'uploading' });
    toast(`Uploading ${file.name}...`, 'info');
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-file-name': encodeURIComponent(file.name), 'Content-Type': 'application/octet-stream' },
        body: file
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      const savedPath: string = data.path;
      setUploadStatus({ name: file.name, path: savedPath, status: 'done' });

      // ── Immediately tell SDRangel which file to use ───────────────────────────
      try {
        const current = await SdrService.getChannelSettings(dsIdx, cIdx);
        const key = Object.keys(current).find(k => k.endsWith('Settings'));
        if (key) {
          // If the file path is the exact same, SDRangel's API diff will ignore it.
          // We must send a dummy path first to force it to close and reopen the new file.
          if (current[key][fileNameField] === savedPath) {
            await SdrService.patchChannelSettings(dsIdx, cIdx, {
              channelType: current.channelType,
              direction: current.direction,
              [key]: { [fileNameField]: "" },
            });
          }
          await SdrService.patchChannelSettings(dsIdx, cIdx, {
            channelType: current.channelType,
            direction: current.direction,
            [key]: { [fileNameField]: savedPath, [srcField]: srcVal },
          });
          toast(`File set: ${savedPath}`, 'success');
        } else {
          toast(`Uploaded. Manually set path: ${savedPath}`, 'info');
        }
      } catch {
        toast(`Uploaded to ${savedPath} — could not auto-set in SDRangel`, 'warning');
      }
    } catch {
      toast('Failed to upload file to backend server.', 'error');
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
      const merged = {
        channelType: current.channelType,
        direction: current.direction,
        [settingsKey]: { ...current[settingsKey], [field]: value },
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
      const merged = {
        channelType: current.channelType,
        direction: current.direction,
        [settingsKey]: { ...current[settingsKey], [field]: value },
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

              {uploadStatus?.status === 'done' && (
                <span title={uploadStatus.path}
                  style={{ fontSize: '9px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {uploadStatus.path}
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
                  onBlur={e => patchChannelSetting('udpAddress', e.target.value)}
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



function DeviceSidebarCard({ idx, ds, deviceSetCount, onAddChannel }: { idx: number, ds: DeviceSet, deviceSetCount: number, onAddChannel: () => void }) {
  const [isTuning, setIsTuning] = useState(false);
  const [freqInput, setFreqInput] = useState("");
  const [hwSettings, setHwSettings] = useState<any>(null);
  const { toast } = useToast();

  const hw = ds.samplingDevice;
  // Fallback state if the backend hasn't updated our poll loop yet
  const [optimisticState, setOptimisticState] = useState<string | null>(null);

  const isRunning = optimisticState !== null
    ? optimisticState === 'running'
    : (hw?.state === 1 || hw?.state === 'running');

  // Clear optimistic state when the real prop catches up
  useEffect(() => {
    if (hw?.state === optimisticState) {
      setOptimisticState(null);
    }
  }, [hw?.state, optimisticState]);

  useEffect(() => {
    if (!isTuning) {
      setFreqInput((hw?.centerFrequency || 0).toLocaleString());
    }
  }, [hw?.centerFrequency, isTuning]);

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
        setHwSettings(fullSettings[hwKey]); // Optimistic UI
      }
    } catch (e) {
      toast(`Failed to set hardware setting ${field}`, "error");
    }
  };

  const handleDelete = async () => {
    if (idx !== deviceSetCount - 1) {
      toast("SDRangel natively requires closing the right-most (latest) workspace first.", "warning");
      return;
    }
    try {
      await SdrService.deleteDeviceSet();
      toast(`Workspace ${idx} closed`, "info");
    } catch (e) {
      toast("Failed to close Device Workspace", "error");
    }
  };

  const handleReloadDevice = async () => {
    try {
      await SdrService.setDeviceState(idx, 0);
      setTimeout(async () => {
        try { await SdrService.setDeviceState(idx, 1); } catch { }
        toast(`Device ${idx} reloaded`, 'success');
      }, 600);
    } catch { toast('Failed to reload device', 'error'); }
  };

  const handleApplyFreq = () => {
    setIsTuning(false);
    const hzStr = freqInput.replace(/,/g, '');
    const hz = parseInt(hzStr, 10);
    if (!isNaN(hz)) patchSetting('centerFrequency', hz);
  };

  const handlePowerDrop = async () => {
    const targetState = isRunning ? 0 : 1;
    setOptimisticState(targetState ? 'running' : 'idle');
    try {
      await SdrService.setDeviceState(idx, targetState);
    } catch (e) {
      setOptimisticState(null); // revert on failure
      toast("Failed to toggle DSP engine state", "error");
    }
  };

  return (
    <div className="device-card">
      <div className="device-header">
        <div className="device-header-left">
          <span className={hw?.direction ? 'tx-badge' : 'rx-badge'}>
            {hw?.direction ? 'T' : 'R'}:{idx}
          </span>
          <span className="hw-label" title={hw?.serial}>
            {hw?.displayedName || (hw?.serial ? `${hw.hwType}[${hw.sequence || 0}:${hw.deviceStreamIndex || 0}]` : hw?.hwType) || 'No Hardware'}
          </span>
        </div>
        <div className="navbar-group">
          <button className="sdr-btn" title="Open SDRangel docs in browser" onClick={() => window.open('https://github.com/f4exb/sdrangel/wiki', '_blank')}>❔</button>
          <button className="sdr-btn" title="Close workspace" onClick={handleDelete}>✖</button>
        </div>
      </div>

      <div className="device-toolbar">
        <button className="sdr-btn" title="Reload device (stop → start DSP)" onClick={handleReloadDevice}>🌐</button>
        <button className="sdr-btn" title="Add channels" style={{ marginLeft: 'auto' }} onClick={onAddChannel}>✚</button>
      </div>

      <div className="freq-display-box">
        <button
          className={`freq-play-btn ${isRunning ? 'running' : 'stopped'}`}
          onClick={handlePowerDrop}
          title={isRunning ? "Stop DSP Device" : "Start DSP Device"}
        >
          {isRunning ? <span style={{ color: '#fff', fontSize: '18px' }}>⏹</span> : <span style={{ color: '#fff', fontSize: '18px' }}>▶</span>}
        </button>
        <div className="freq-input-wrapper">
          <input
            type="text"
            value={freqInput}
            onChange={(e) => { setIsTuning(true); setFreqInput(e.target.value); }}
            onBlur={handleApplyFreq}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFreq()}
            className="freq-number"
            title="Absolute Center Frequency"
          />
          <span className="freq-unit">Hz</span>
        </div>
      </div>

      {hwSettings && (
        <div className="device-sub-settings">
          {hwSettings.devSampleRate !== undefined && (
            <div className="setting-group">
              <label>Sample Rate</label>
              <input type="number"
                value={hwSettings.devSampleRate}
                onChange={(e) => setHwSettings({ ...hwSettings, devSampleRate: parseInt(e.target.value) })}
                onBlur={(e) => patchSetting('devSampleRate', parseInt(e.target.value))}
              />
            </div>
          )}
          {hwSettings.antennaPath !== undefined && (
            <div className="setting-group">
              <label>Antenna Port</label>
              <select
                value={hwSettings.antennaPath}
                onChange={(e) => {
                  setHwSettings({ ...hwSettings, antennaPath: e.target.value });
                  patchSetting('antennaPath', e.target.value);
                }}
                style={{ background: '#222', color: '#fff', border: '1px solid #555', fontSize: '11px', padding: '2px 4px', width: '100%', borderRadius: '3px' }}
              >
                <option value="TX/RX">TX/RX</option>
                <option value="RX2">RX2</option>
              </select>
            </div>
          )}
          {hwSettings.log2Decim !== undefined && (
            <div className="setting-group">
              <label>Decim (Log2)</label>
              <input type="number" min="0" max="6"
                value={hwSettings.log2Decim}
                onChange={(e) => setHwSettings({ ...hwSettings, log2Decim: parseInt(e.target.value) })}
                onBlur={(e) => patchSetting('log2Decim', parseInt(e.target.value))}
              />
            </div>
          )}
          {hwSettings.gain !== undefined && (
            <div className="setting-group">
              <label>Hardware Gain</label>
              <input type="range" min="0" max="80"
                value={hwSettings.gain}
                onChange={(e) => setHwSettings({ ...hwSettings, gain: parseInt(e.target.value) })}
                onMouseUp={() => patchSetting('gain', hwSettings.gain)}
              />
            </div>
          )}
          {hwSettings.lnaGain !== undefined && (
            <div className="setting-group">
              <label>LNA Gain</label>
              <input type="range" min="0" max="40" step="8"
                value={hwSettings.lnaGain}
                onChange={(e) => setHwSettings({ ...hwSettings, lnaGain: parseInt(e.target.value) })}
                onMouseUp={() => patchSetting('lnaGain', hwSettings.lnaGain)}
              />
            </div>
          )}
          {hwSettings.vgaGain !== undefined && (
            <div className="setting-group">
              <label>VGA Gain</label>
              <input type="range" min="0" max="62" step="2"
                value={hwSettings.vgaGain}
                onChange={(e) => setHwSettings({ ...hwSettings, vgaGain: parseInt(e.target.value) })}
                onMouseUp={() => patchSetting('vgaGain', hwSettings.vgaGain)}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Per-device inline spectrum ───────────────────────── */}
      <DeviceSpectrum idx={idx} ds={ds} />

      {/* ── Channel cards for this device ───────────────────── */}
      {(ds.channels || []).map((ch: any, cIdx: number) => (
        <ChannelWorkspaceCard key={`${idx}-${cIdx}`} dsIdx={idx} cIdx={cIdx} channel={ch} />
      ))}
    </div>
  );
}

/** Compact live spectrum embedded per device */
function DeviceSpectrum({ idx, ds }: { idx: number, ds: DeviceSet }) {
  const binsRef = useRef<Float32Array | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('DEMO');
  const specRef = useRef<HTMLCanvasElement>(null);
  const wfRef = useRef<HTMLCanvasElement>(null);

  const hw = ds.samplingDevice;
  const hasDevice = !!hw;
  const freqMhz = hw?.centerFrequency ? (hw.centerFrequency / 1e6).toFixed(3) : '?';
  const srMhz = hw?.devSampleRate ? (hw.devSampleRate / 1e6).toFixed(3) : '?';

  useSpectrumData({
    binsRef,
    onDataSource: setDataSource,
    deviceSetIndex: idx,
    hasDevice,
    isRunning: hw?.state === 1 || hw?.state === 'running',
    isApiConnected: true,
    wsPort: 8887,
  });

  useEffect(() => {
    const sCanvas = specRef.current;
    const wCanvas = wfRef.current;
    if (!sCanvas || !wCanvas) return;

    const sCtx = sCanvas.getContext('2d');
    const wCtx = wCanvas.getContext('2d', { willReadFrequently: true });
    if (!sCtx || !wCtx) return;

    const W = sCanvas.width;
    const SH = sCanvas.height;
    const WH = wCanvas.height;

    // Helper to map dB value to RGB color for waterfall
    const dbToWaterFall = (db: number) => {
      // mapping roughly -120 to 0 dB to colors: Black -> Blue -> Green -> Yellow -> Red
      const mapped = Math.max(0, Math.min(1, (db + 110) / 100)); // normalized 0..1
      const r = mapped < 0.5 ? 0 : mapped < 0.75 ? (mapped - 0.5) * 4 * 255 : 255;
      const g = mapped < 0.25 ? 0 : mapped < 0.5 ? (mapped - 0.25) * 4 * 255 : mapped < 0.75 ? 255 : 255 - (mapped - 0.75) * 4 * 128;
      const b = mapped < 0.25 ? mapped * 4 * 255 : mapped < 0.5 ? 255 - (mapped - 0.25) * 4 * 255 : 0;
      return [r, g, b, 255];
    };

    const wfImageData = wCtx.createImageData(W, 1);
    let raf: number;

    const draw = () => {
      const bins = binsRef.current;
      
      // 1. Draw Top Spectrum
      sCtx.clearRect(0, 0, W, SH);
      
      // Background and grid
      sCtx.fillStyle = '#050508'; // Very dark
      sCtx.fillRect(0, 0, W, SH);
      
      sCtx.strokeStyle = 'rgba(255,255,255,0.05)';
      sCtx.lineWidth = 1;
      sCtx.beginPath();
      for (let x = W/2 % 40; x < W; x += 40) { sCtx.moveTo(x, 0); sCtx.lineTo(x, SH); }
      for (let y = 20; y < SH; y += 20) { sCtx.moveTo(0, y); sCtx.lineTo(W, y); }
      sCtx.stroke();

      // Top label text
      sCtx.fillStyle = '#ccc';
      sCtx.font = '10px monospace';
      sCtx.fillText(`CF:${freqMhz}M SP:${srMhz}M`, 5, 12);
      sCtx.fillText('0', 5, 25);
      sCtx.fillText('-100', 5, SH - 10);

      // Purple baseline
      sCtx.fillStyle = '#8e44ad';
      sCtx.fillRect(0, SH - 6, W, 6);

      if (bins && bins.length > 0) {
        const n = bins.length;
        const step = n / W;

        sCtx.beginPath();
        sCtx.strokeStyle = '#f1c40f'; // Solid yellow trace
        sCtx.fillStyle = 'rgba(241, 196, 15, 0.2)'; // Yellow fill under trace
        sCtx.lineWidth = 1.0;
        
        // Start from bottom left for the fill
        sCtx.moveTo(0, SH - 6);
        
        // Populate exactly W pixels wide
        for (let px = 0; px < W; px++) {
          const b = Math.min(Math.floor(px * step), n - 1);
          const db = bins[b];
          const y = Math.max(0, Math.min(SH - 6, (SH - 6) * (1 - (db + 110) / 110)));
          
          sCtx.lineTo(px, y);
          
          // Color for the waterfall row
          const color = dbToWaterFall(db);
          const idx = px * 4;
          wfImageData.data[idx]   = color[0];
          wfImageData.data[idx+1] = color[1];
          wfImageData.data[idx+2] = color[2];
          wfImageData.data[idx+3] = 255;
        }

        // Close path for fill
        sCtx.lineTo(W, SH - 6);
        sCtx.closePath();
        sCtx.fill();
        sCtx.stroke();

        // 2. Draw Waterfall
        // Shift old image down by 1 pixel
        const oldWf = wCtx.getImageData(0, 0, W, WH - 1);
        wCtx.putImageData(oldWf, 0, 1);
        // Draw the new row at the top
        wCtx.putImageData(wfImageData, 0, 0);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freqMhz, srMhz]);

  const badgeColor = dataSource === 'LIVE' ? '#2ed573' : dataSource === 'DEMO' ? '#f39c12' : '#ff4757';

  return (
    <div style={{ borderTop: '1px solid var(--border-color)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: 3, right: 4, zIndex: 5, display: 'flex', gap: '5px', alignItems: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.8)', padding: '2px 4px', borderRadius: '3px', color: badgeColor, border: `1px solid ${badgeColor}` }}>
          {dataSource}
        </span>
      </div>
      <canvas ref={specRef} width={800} height={90} style={{ width: '100%', height: '90px', display: 'block' }} />
      <canvas ref={wfRef} width={800} height={100} style={{ width: '100%', height: '100px', display: 'block', borderTop: '1px solid #111' }} />
    </div>
  );
}

function SpectrumVisualizer({
  freqMhz, isConnected, gridMode, maxHold, colorMap, dbRange, refLevel,
  showWaterfall, phosphorMode, avgMode, spectrumMode, binsRef, dataSource,
}: {
  freqMhz: string; isConnected: boolean; gridMode: boolean; maxHold: boolean;
  colorMap: string; dbRange: number; refLevel: number;
  showWaterfall: boolean; phosphorMode: boolean; avgMode: boolean;
  spectrumMode: 'line' | 'histogram';
  binsRef: React.MutableRefObject<Float32Array | null>;
  dataSource: DataSource;
}) {
  const plotRef = useRef<HTMLCanvasElement>(null);
  const waterfallRef = useRef<HTMLCanvasElement>(null);
  // binsRef is passed from parent — RAF loop reads current value directly (no re-render)

  useEffect(() => {
    const plotCanvas = plotRef.current;
    const wfCanvas = waterfallRef.current;
    if (!plotCanvas) return;

    const plotCtx = plotCanvas.getContext('2d');
    if (!plotCtx) return;

    const wfCtx = wfCanvas ? wfCanvas.getContext('2d') : null;
    const w = plotCanvas.width;
    const hPlot = plotCanvas.height;
    const hWF = wfCanvas ? wfCanvas.height : 0;

    // Waterfall backing buffer
    const wfBacking = document.createElement('canvas');
    wfBacking.width = w;
    wfBacking.height = hWF;
    const wfBackCtx = wfBacking.getContext('2d');

    // Persistent state across frames
    const maxBuffer = new Float32Array(w).fill(-140);
    const avgBuffer = new Float32Array(w).fill(-100);
    let reqId: number;

    // ── dBFS → canvas Y ─────────────────────────────────────────────
    // refLevel  = top of display (e.g. 0 dBFS)
    // dbRange   = total height in dB (e.g. 100 dB)
    // bin value is negative dBFS; map to 0..1 then to canvas pixels
    const binToY = (dbVal: number) => {
      const normalized = (refLevel - dbVal) / dbRange; // 0 = top, 1 = bottom
      return Math.max(0, Math.min(1, normalized)) * hPlot;
    };

    // ── bin value → 0..1 for colormap ───────────────────────────────
    const binToV = (dbVal: number) => {
      const normalized = 1 - (refLevel - dbVal) / dbRange;
      return Math.max(0, Math.min(1, normalized));
    };

    const colorize = (v: number): [number, number, number] => {
      if (colorMap === 'Ice') {
        return [
          Math.min(255, Math.floor(Math.max(0, v - 0.6) * 2.5 * 255)),
          Math.min(255, Math.floor(Math.max(0, v - 0.3) * 2 * 255)),
          Math.min(255, Math.floor(v * 2 * 255)),
        ];
      }
      // "Angel" colormap
      if (v < 0.2) return [0, 0, Math.floor(v * 5 * 255)];
      if (v < 0.5) return [0, Math.floor((v - 0.2) * 3.3 * 255), 255];
      if (v < 0.8) return [Math.floor((v - 0.5) * 3.3 * 255), 255, 255];
      return [255, Math.floor((1 - v) * 5 * 255), 0];
    };

    const draw = () => {
      const bins = binsRef.current;
      const n = bins ? bins.length : w;
      const step = n / w; // how many FFT bins per canvas pixel

      // Build a per-pixel dB array (average bins that map to the same pixel)
      const pxdB = new Float32Array(w);
      if (bins) {
        for (let px = 0; px < w; px++) {
          const startBin = Math.floor(px * step);
          const endBin = Math.min(n - 1, Math.floor((px + 1) * step));
          let sum = 0, cnt = 0;
          for (let b = startBin; b <= endBin; b++) { sum += bins[b]; cnt++; }
          pxdB[px] = cnt > 0 ? sum / cnt : -120;
        }
      } else {
        pxdB.fill(-100);
      }

      // Max hold decay
      for (let px = 0; px < w; px++) {
        if (pxdB[px] > maxBuffer[px]) maxBuffer[px] = pxdB[px];
        else maxBuffer[px] = Math.max(maxBuffer[px] - 0.3, pxdB[px] - 60);
        // Moving average
        avgBuffer[px] = avgMode ? avgBuffer[px] * 0.9 + pxdB[px] * 0.1 : pxdB[px];
      }

      const displayBins = avgMode ? avgBuffer : pxdB;

      // ── Spectrum plot ─────────────────────────────────────────────
      plotCtx.clearRect(0, 0, w, hPlot);

      if (gridMode) {
        plotCtx.strokeStyle = 'rgba(255,255,255,0.06)';
        plotCtx.lineWidth = 1;
        plotCtx.beginPath();
        for (let x = 0; x < w; x += 50) { plotCtx.moveTo(x, 0); plotCtx.lineTo(x, hPlot); }
        for (let y = 0; y < hPlot; y += 25) { plotCtx.moveTo(0, y); plotCtx.lineTo(w, y); }
        plotCtx.stroke();

        // dB labels on grid lines
        plotCtx.fillStyle = 'rgba(255,255,255,0.25)';
        plotCtx.font = '9px monospace';
        for (let dbMark = refLevel; dbMark >= refLevel - dbRange; dbMark -= 20) {
          const y = binToY(dbMark);
          plotCtx.fillText(`${dbMark} dB`, 4, y - 2);
        }
      }

      // Phosphor decay effect: don't clear, composite with low-opacity overlay
      if (phosphorMode) {
        plotCtx.fillStyle = 'rgba(0,0,0,0.18)';
        plotCtx.fillRect(0, 0, w, hPlot);
      }

      // FFT trace
      plotCtx.beginPath();
      plotCtx.moveTo(0, binToY(displayBins[0]));
      for (let px = 1; px < w; px++) plotCtx.lineTo(px, binToY(displayBins[px]));

      if (spectrumMode === 'histogram') {
        plotCtx.fillStyle = 'rgba(255,165,0,0.3)';
        plotCtx.lineTo(w, hPlot);
        plotCtx.lineTo(0, hPlot);
        
        const grad = plotCtx.createLinearGradient(0, 0, 0, hPlot);
        grad.addColorStop(0, 'rgba(255,165,0,0.6)');
        grad.addColorStop(1, 'rgba(255,165,0,0.1)');
        plotCtx.fillStyle = grad;
        plotCtx.fill();
        
        // draw a subtle top line
        plotCtx.beginPath();
        plotCtx.strokeStyle = 'rgba(255,200,0,0.8)';
        plotCtx.lineWidth = 1;
        plotCtx.moveTo(0, binToY(displayBins[0]));
        for (let px = 1; px < w; px++) plotCtx.lineTo(px, binToY(displayBins[px]));
        plotCtx.stroke();
      } else {
        // Just the line trace
        plotCtx.beginPath();
        plotCtx.strokeStyle = 'rgba(255,255,0,0.9)';
        plotCtx.lineWidth = 1.5;
        plotCtx.moveTo(0, binToY(displayBins[0]));
        for (let px = 1; px < w; px++) plotCtx.lineTo(px, binToY(displayBins[px]));
        plotCtx.stroke();
      }

      // Max hold (red)
      if (maxHold) {
        plotCtx.beginPath();
        plotCtx.strokeStyle = 'rgba(255,60,60,0.85)';
        plotCtx.lineWidth = 1;
        plotCtx.moveTo(0, binToY(maxBuffer[0]));
        for (let px = 1; px < w; px++) plotCtx.lineTo(px, binToY(maxBuffer[px]));
        plotCtx.stroke();
      }

      // ── Waterfall ─────────────────────────────────────────────────
      if (wfCtx && wfBackCtx) {
        wfBackCtx.drawImage(wfBacking, 0, 0);
        const imgData = wfBackCtx.createImageData(w, 1);
        for (let px = 0; px < w; px++) {
          const [r, g, b] = colorize(binToV(pxdB[px]));
          const i4 = px * 4;
          imgData.data[i4] = r;
          imgData.data[i4 + 1] = g;
          imgData.data[i4 + 2] = b;
          imgData.data[i4 + 3] = 255;
        }
        wfBackCtx.putImageData(imgData, 0, 0);
        wfBackCtx.drawImage(wfBacking, 0, 0, w, hWF - 1, 0, 1, w, hWF - 1);
        wfCtx.drawImage(wfBacking, 0, 0);
      }

      reqId = requestAnimationFrame(draw);
    };

    reqId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(reqId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridMode, maxHold, colorMap, dbRange, refLevel, showWaterfall, phosphorMode, avgMode, spectrumMode]);

  // Source badge color
  const badgeColor = dataSource === 'LIVE' ? '#2ed573' : dataSource === 'DEMO' ? '#f39c12' : '#ff4757';

  return (
    <>
      <div className="spectrum-view" style={{ flex: '1 1 auto', position: 'relative' }}>
        {/* Overlay: freq + data source indicator */}
        <div style={{ position: 'absolute', top: 4, left: 6, zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>
            CF:{freqMhz}M
          </span>
          <span style={{
            fontSize: '9px', fontWeight: 700, padding: '1px 5px',
            borderRadius: '3px', background: badgeColor + '33',
            border: `1px solid ${badgeColor}`, color: badgeColor, letterSpacing: '0.05em',
          }}>
            {dataSource}
          </span>
          {!isConnected && <span style={{ fontSize: '9px', color: '#ff4757' }}>(API Offline)</span>}
        </div>
        <canvas ref={plotRef} id="spectrum-plot" width={900} height={220}
          style={{ width: '100%', height: '100%', background: 'var(--bg-dark)', display: 'block' }} />
        <div className="spectrum-axis" style={{ position: 'absolute', bottom: 0, width: '100%' }}>
          <span>{(parseFloat(freqMhz) - 0.020).toFixed(3)}</span>
          <span>{(parseFloat(freqMhz) - 0.010).toFixed(3)}</span>
          <span>{freqMhz}</span>
          <span>{(parseFloat(freqMhz) + 0.010).toFixed(3)}</span>
          <span>{(parseFloat(freqMhz) + 0.020).toFixed(3)}</span>
        </div>
      </div>

      {showWaterfall && (
        <div className="spectrum-view" style={{ height: '150px', position: 'relative', borderTop: '1px solid var(--border-color)' }}>
          <canvas ref={waterfallRef} width={900} height={150} style={{ width: '100%', height: '100%', display: 'block' }} />
          <div style={{ position: 'absolute', right: 4, top: 4, display: 'flex', flexDirection: 'column', gap: '8px', color: '#ccc', fontSize: '10px', textShadow: '1px 1px 1px #000' }}>
            <span>0 ms</span><span>200</span><span>400</span><span>600</span><span>800</span><span>1000</span>
          </div>
        </div>
      )}
    </>
  );
}


function MainWorkspace({ deviceSets, isConnected }: { deviceSets: DeviceSet[], isConnected: boolean }) {
  if (!isConnected) {
    return (
      <div className="workspace-area" style={{ alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '13px' }}>
        <p>🔴 SDRangel backend is offline. Start sdrsrv or SDRangel with the API enabled on port 8091.</p>
      </div>
    );
  }
  if (deviceSets.length === 0) {
    return (
      <div className="workspace-area" style={{ alignItems: 'center', justifyContent: 'center', color: '#555', flexDirection: 'column', gap: '8px' }}>
        <p style={{ fontSize: '15px' }}>No devices active.</p>
        <p style={{ fontSize: '12px' }}>Use <strong>+ Rx</strong> or <strong>+ Tx</strong> in the top bar to add a workspace.<br/>Each device will show its own spectrum inline.</p>
      </div>
    );
  }
  return (
    <div className="workspace-area" style={{ alignItems: 'flex-start', justifyContent: 'center', padding: '16px' }}>
      <p style={{ color: '#555', fontSize: '12px' }}>
        Spectra and channel plugins are displayed in each device card on the left sidebar.
      </p>
    </div>
  );
}

function MediaPlayerPanel({ deviceSets }: { deviceSets: DeviceSet[] }) {
  // Find the DATV channel's file path from any TX device set
  const [filePath, setFilePath] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

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

  return (
    <div style={{
      flexShrink: 0, height: '180px',
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
        {/* Waveform / thumbnail area */}
        <div style={{
          width: '220px', flexShrink: 0, height: '100%',
          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,140,0,0.15)',
          borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* animated SVG waveform */}
          <svg width="200" height="80" viewBox="0 0 200 80" style={{ opacity: isPlaying ? 1 : 0.3 }}>
            <defs>
              <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ff8c00" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#ff4500" stopOpacity="0.3"/>
              </linearGradient>
            </defs>
            {[8,18,30,12,40,22,35,15,45,25,18,38,10,42,28,20,36,14,32,24,16,44,26,12,38,20,34,10,42,22].map((h, i) => (
              <rect key={i} x={i*6+5} y={(80-h)/2} width={4} height={h}
                fill="url(#wg)" rx={2}
                style={{ animation: isPlaying ? `pulse ${0.4 + (i%5)*0.1}s ease-in-out infinite alternate` : 'none' }}
              />
            ))}
          </svg>
          <div style={{ position: 'absolute', bottom: '6px', left: '8px', fontSize: '9px', color: '#555', fontFamily: 'JetBrains Mono,monospace' }}>
            {isPlaying ? 'LIVE TX' : 'STANDBY'}
          </div>
        </div>

        {/* File info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
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
  const [audioOutDevices, setAudioOutDevices] = useState<any[]>([]);

  // Modal / sidebar visibility
  const [registryTarget, setRegistryTarget] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchSdrStatus = async () => {
      try {
        const [dsData, audioData] = await Promise.all([
          SdrService.getDeviceSets(),
          SdrService.getAudio().catch(() => null)
        ]);
        setDeviceSets(dsData?.deviceSets || []);
        if (audioData?.outputDevices) {
           setAudioOutDevices(audioData.outputDevices);
        }
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
      toast(`Successfully added ${pluginId} channel plugin`, "success" as any);
    } catch (e) {
      toast(`Failed to add plugin`, "error");
    } finally {
      setRegistryTarget(null);
    }
  };

  return (
    <div className="sdr-app">
      <TopNavbar
        isConnected={isConnected}
        onOpenPresets={() => setShowPresets(true)}
        onToggleFeatures={() => setShowFeatures(v => !v)}
        featuresOpen={showFeatures}
        onOpenPreferences={() => setShowPreferences(true)}
        audioOutDevices={audioOutDevices}
      />

      {/* ── TX DASHBOARD: 3-panel broadcast console ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(160deg, #0d0f14 0%, #111318 60%, #0a0d11 100%)' }}>

        {/* TOP ROW: TX Device (left) + DATV Modulator (right) */}
        <div style={{ display: 'flex', flex: '1 1 0', minHeight: 0, gap: '1px', background: 'rgba(255,140,0,0.08)' }}>

          {/* ── TX DEVICE PANEL ── */}
          <div style={{
            flex: '0 0 420px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: 'linear-gradient(145deg,#13151c,#0e1018)',
            borderRight: '1px solid rgba(255,140,0,0.2)',
          }}>
            {/* Panel header */}
            <div style={{
              background: 'linear-gradient(90deg,rgba(255,140,0,0.15),rgba(255,140,0,0.03))',
              borderBottom: '1px solid rgba(255,140,0,0.3)', padding: '10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: '#c0392b', color: '#fff', fontWeight: 800, fontSize: '10px', padding: '2px 7px', borderRadius: '3px', letterSpacing: '0.1em' }}>TX</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#e0e0e0', fontFamily: 'Inter,sans-serif' }}>Device Control</span>
              </div>
              <span style={{ fontSize: '10px', color: '#555', fontFamily: 'JetBrains Mono,monospace' }}>
                {deviceSets.find(d => d.samplingDevice?.direction === 1)?.samplingDevice?.displayedName || 'No Device'}
              </span>
            </div>

            {/* Scrollable device list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {deviceSets.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#444' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📡</div>
                  <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.6 }}>No TX device active.<br/>Click <strong style={{color:'#2ed573'}}>✚ Tx</strong> in the top bar to add one.</div>
                </div>
              ) : deviceSets.map((ds, idx) => (
                <DeviceSidebarCard key={idx} idx={idx} ds={ds} deviceSetCount={deviceSets.length} onAddChannel={() => setRegistryTarget(idx)} />
              ))}
            </div>
          </div>

          {/* ── DATV MODULATOR PANEL ── */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: 'linear-gradient(145deg,#12141b,#0d0f16)',
          }}>
            <div style={{
              background: 'linear-gradient(90deg,rgba(255,140,0,0.12),rgba(255,140,0,0.02))',
              borderBottom: '1px solid rgba(255,140,0,0.25)', padding: '10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'rgba(255,140,0,0.2)', color: '#ff8c00', fontWeight: 800, fontSize: '10px', padding: '2px 7px', borderRadius: '3px', border: '1px solid rgba(255,140,0,0.4)', letterSpacing: '0.08em' }}>M-DATV</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#e0e0e0' }}>Plugins</span>
              </div>
              <span style={{ fontSize: '10px', color: '#555' }}>DATV Modulator</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {deviceSets.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#444' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔌</div>
                  <div style={{ fontSize: '13px', color: '#555' }}>Add a TX device first, then attach a DATV Modulator channel.</div>
                </div>
              ) : (
                deviceSets.map((ds, idx) => {
                  const channels = ds.channels || [];
                  if (channels.length === 0) return (
                    <div key={idx} style={{ padding: '32px 20px', textAlign: 'center', color: '#444' }}>
                      <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
                        No channel plugins on device {idx}.<br/>
                        <button onClick={() => setRegistryTarget(idx)} style={{
                          marginTop: '12px', background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.4)',
                          color: '#ff8c00', borderRadius: '6px', padding: '6px 18px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                        }}>+ Add Channel Plugin</button>
                      </div>
                    </div>
                  );
                  return channels.map((ch: any, cIdx: number) => (
                    <ChannelWorkspaceCard key={`${idx}-${cIdx}`} dsIdx={idx} cIdx={cIdx} channel={ch} />
                  ));
                })
              )}
            </div>
          </div>

          {showFeatures && <FeatureSidebar onClose={() => setShowFeatures(false)} />}
        </div>

        {/* ── BOTTOM: MEDIA PLAYER PANEL ── */}
        <MediaPlayerPanel deviceSets={deviceSets} />
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
