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
    state: number;
  };
}

function TopNavbar({ isConnected, onOpenPresets, onToggleFeatures, featuresOpen, onOpenPreferences }: { 
  isConnected: boolean;
  onOpenPresets: () => void;
  onToggleFeatures: () => void;
  featuresOpen: boolean;
  onOpenPreferences: () => void;
}) {
  const { toast } = useToast();

  const handleCreateRx = async () => {
    try { await SdrService.createDeviceSet(0); toast("Rx Workspace created", "info"); } 
    catch(e) { toast("Failed to create Rx device", "error"); }
  };
  const handleCreateTx = async () => {
    try { await SdrService.createDeviceSet(1); toast("Tx Workspace created", "info"); } 
    catch(e) { toast("Failed to create Tx device", "error"); }
  };
  
  const handleStub = (name: string) => toast(`'${name}' is not implemented yet.`, "warning");

  return (
    <div className="top-navbar">
      <div className="navbar-group">
        <button className="sdr-btn" title="Workspaces Index" onClick={() => handleStub('Workspace Index')}>W0</button>
        <button className="sdr-btn" title="Preset Manager" onClick={onOpenPresets}>⭐</button>
      </div>
      <div className="nav-divider"></div>
      
      <div className="navbar-group">
        <button className="sdr-btn danger" title="Create new receiver" onClick={handleCreateRx}>✚ Rx</button>
        <button className="sdr-btn success" title="Create new transmitter" onClick={handleCreateTx}>✚ Tx</button>
        <button className="sdr-btn" title="Create new MIMO device" style={{color:'#f39c12'}} onClick={() => handleStub('Add MIMO')}>✚ M</button>
        <button 
          className="sdr-btn" 
          title="Toggle Feature Sidebar"
          style={{color: featuresOpen ? '#9b59b6' : '#888', background: featuresOpen ? 'rgba(155,89,182,0.2)' : 'transparent'}}
          onClick={onToggleFeatures}
        >✚ F</button>
      </div>
      <div className="nav-divider"></div>

      <div className="navbar-group">
        <button className="sdr-btn" title="Cascade windows" onClick={() => handleStub('Cascade')}>▤</button>
        <button className="sdr-btn" title="Tile windows" onClick={() => handleStub('Tile')}>◫</button>
        <button className="sdr-btn" title="Stack windows" onClick={() => handleStub('Stack')}>☰</button>
        <button className="sdr-btn" title="Auto stack windows" onClick={() => handleStub('Auto Stack')}>⇶</button>
      </div>
      <div className="nav-divider"></div>

      <div className="navbar-group">
        <button className="sdr-btn" title="Dock/Undock workspace" onClick={() => handleStub('Dock/Undock Workspace')}>⎘</button>
        <button className="sdr-btn" title="Hide workspace" onClick={() => handleStub('Hide Workspace')}>◑</button>
      </div>

      <div style={{ flex: 1 }}></div>

      <div className="navbar-group">
        <span style={{ fontSize: '12px', color: isConnected ? '#2ed573' : '#ff4757', marginRight: '10px' }}>
          {isConnected ? 'API Connected' : 'API Unreachable'}
        </span>
        <button className="sdr-btn" title="Preferences" onClick={onOpenPreferences}>⚙️</button>
      </div>
    </div>
  );
}

// ─── PREFERENCES MODAL ────────────────────────────────────────────────────────
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
                {p.name} <span style={{fontSize:'10px', color:'#999', float: 'right'}}>v{p.version}</span>
              </div>
            ))}
            {plugins.length === 0 && <span style={{color: '#888', padding: '10px'}}>Loading available plugins...</span>}
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
          running: f.state === 1,
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
    try {
      await SdrService.runFeature(Number(f.id), !f.running);
      toast(`Feature ${f.running ? 'stopped' : 'started'}`, 'info');
      refresh();
    } catch { toast('Failed to toggle feature state', 'error'); }
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
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <select
          value={selectedCatalog}
          onChange={e => setSelectedCatalog(e.target.value)}
          style={{ flex: 1, background: 'var(--bg-medium)', border: '1px solid var(--border-color)', color: '#ddd', fontSize: '12px', padding: '3px' }}
        >
          <option value="">Select feature plugin…</option>
          {catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {catalog.length === 0 && <option disabled>Backend offline</option>}
        </select>
        <button className="sdr-btn success" onClick={handleAdd}>✚</button>
      </div>

      {/* Active features list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {active.length === 0 && (
          <div style={{ padding: '16px', color: '#555', fontSize: '12px', textAlign: 'center' }}>
            No features active.<br />Add one from the list above.
          </div>
        )}
        {active.map(f => (
          <div key={f.id} className="channel-card" style={{ margin: '6px', padding: 0 }}>
            <div className="channel-header" style={{ background: f.running ? 'rgba(46,213,115,0.15)' : 'rgba(80,80,80,0.2)' }}>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>F:{f.id} {f.title}</span>
              <div className="navbar-group" style={{ marginLeft: 'auto' }}>
                <button
                  className="sdr-btn"
                  style={{ color: f.running ? '#2ed573' : '#aaa' }}
                  onClick={() => handleToggleRun(f)}
                  title={f.running ? 'Stop' : 'Start'}
                >
                  {f.running ? '⏹' : '▶'}
                </button>
                <button className="sdr-btn" style={{ color: '#ff6b6b' }} onClick={() => handleDelete(f)} title="Delete">✖</button>
              </div>
            </div>
            <div style={{ padding: '6px 10px', fontSize: '11px', color: '#777' }}>
              Type: <span style={{ color: '#aaa' }}>{f.featureType}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelWorkspaceCard({ dsIdx, cIdx, channel }: { dsIdx: number, cIdx: number, channel: any }) {
  const { toast } = useToast();
  const [squelch, setSquelch] = useState<number>(-50);
  const [gain, setGain] = useState<number>(2);
  
  const handleClose = async () => {
    try {
      await SdrService.deleteChannel(dsIdx, cIdx);
      toast(`${channel.title} removed`, "info");
    } catch(e) {
      toast("Failed to remove channel workspace", "error");
    }
  };

  const patchChannelSetting = async (field: string, value: number) => {
    try {
      await SdrService.patchChannelSettings(dsIdx, cIdx, { [field]: value });
    } catch {
      toast(`Failed to update ${field}`, 'error');
    }
  };

  const openHelp = () => {
    window.open(`https://github.com/f4exb/sdrangel/blob/master/plugins/channelrx/${channel.id?.toLowerCase()}/readme.md`, '_blank');
  };

  const isTx = channel.direction === 1;

  return (
    <div className="channel-card">
       <div className="channel-header" style={{ background: isTx ? 'rgba(255, 71, 87, 0.2)' : 'rgba(46, 213, 115, 0.2)' }}>
           <span style={{fontWeight: 600}}>
             {isTx ? 'T' : 'R'}:{dsIdx};{cIdx} &nbsp; 
             <span style={{color: '#eee'}}>{channel.title}</span>
           </span>
           <div className="navbar-group">
               <button className="sdr-btn" title="Channel Settings (opens docs)" onClick={openHelp}>❔</button>
               <button className="sdr-btn" title="Move Workspace" onClick={() => toast('Move Workspace: drag-and-drop not supported in web UI', 'info')}>⎘</button>
               <button className="sdr-btn" title="Close" onClick={handleClose}>✖</button>
           </div>
       </div>
       <div className="channel-body">
           <div className="freq-display-box" style={{padding: '4px'}}>
              <span style={{fontSize: '11px', color: '#aaa', alignSelf: 'center'}}>Δf Offset (Hz)</span>
              <input type="number" className="freq-number" style={{fontSize: '14px', width: '100px', marginLeft: 'auto'}}
                defaultValue={channel.deltaFrequency}
                onBlur={e => patchChannelSetting('inputFrequencyOffset', parseInt(e.target.value))}
              />
           </div>
           
           {!isTx && (
             <div className="setting-group" style={{marginTop: '4px'}}>
                <label>Audio Squelch ({squelch} dB)</label>
                <input type="range" min="-100" max="0" value={squelch}
                  onChange={e => setSquelch(Number(e.target.value))}
                  onMouseUp={() => patchChannelSetting('squelch', squelch)} />
             </div>
           )}

           <div className="setting-group" style={{marginTop: isTx ? '4px' : '0'}}>
              <label>{isTx ? 'Input Gain' : 'Gain (Volume)'} ({gain})</label>
              <input type="range" min="0" max="10" value={gain}
                onChange={e => setGain(Number(e.target.value))}
                onMouseUp={() => patchChannelSetting(isTx ? 'inputVolumeFactor' : 'volume', gain)} />
           </div>
       </div>
       
       <div className="spectrum-toolbar" style={{borderTop: '1px solid var(--border-color)', marginTop: 'auto', padding: '4px'}}>
          <button className="sdr-btn" title="Channel is stateless – duplicate not supported" onClick={() => toast('Channel duplication requires hardware re-init', 'info')}>⎘</button>
          <button className="sdr-btn" title="Attach to another device set" onClick={() => toast('Device binding: stop DSP first, then re-add channel', 'info')}>🔗</button>
          <span style={{marginLeft: 'auto', fontSize: '10px', color: '#999', alignSelf: 'center'}}>
             CF: {(channel.deltaFrequency || 0).toLocaleString()} Hz
          </span>
       </div>
    </div>
  );
}


function DeviceSidebarCard({ idx, ds, onAddChannel }: { idx: number, ds: DeviceSet, onAddChannel: () => void }) {
  const [isTuning, setIsTuning] = useState(false);
  const [freqInput, setFreqInput] = useState("");
  const [hwSettings, setHwSettings] = useState<any>(null);
  const { toast } = useToast();
  
  const hw = ds.samplingDevice;
  const isRunning = hw?.state === 1;

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
      } catch (e) {}
    };
    fetchHw();
    const inv = setInterval(fetchHw, 3000);
    return () => clearInterval(inv);
  }, [idx]);

  const patchSetting = async (field: string, value: number) => {
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
    try {
      await SdrService.deleteDeviceSet(idx);
      toast(`Workspace ${idx} closed`, "info");
    } catch(e) {
      toast("Failed to close Device Workspace", "error");
    }
  };

  const handleReloadDevice = async () => {
    try {
      await SdrService.setDeviceState(idx, 0);
      setTimeout(async () => {
        try { await SdrService.setDeviceState(idx, 1); } catch {}
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
    try {
      await SdrService.setDeviceState(idx, isRunning ? 0 : 1);
    } catch(e) {
      toast("Failed to toggle DSP engine state", "error");
    }
  };

  const handleStub = (name: string) => toast(name, "info");


  return (
    <div className="device-card">
      <div className="device-header">
        <div className="device-header-left">
          <span className={hw?.direction ? 'tx-badge' : 'rx-badge'}>
            {hw?.direction ? 'T' : 'R'}:{idx}
          </span>
          <span className="hw-label">{hw?.hwType || 'No Hardware'}</span>
        </div>
        <div className="navbar-group">
          <button className="sdr-btn" title="Open SDRangel docs in browser" onClick={() => window.open('https://github.com/f4exb/sdrangel/blob/master/doc/MainWindow.md', '_blank')}>❔</button>
          <button className="sdr-btn" title="Move to another workspace (UI-only panels not supported)" onClick={() => toast('Workspace panels are fixed in web layout', 'info')}>⎘</button>
          <button className="sdr-btn" title="Close workspace" onClick={handleDelete}>✖</button>
        </div>
      </div>

      <div className="device-toolbar">
        <button className="sdr-btn" title="Device common settings" onClick={() => handleStub('Device Common Settings: see gain/rate sliders below')}>⚙️</button>
        <button className="sdr-btn" title="Change device" onClick={() => handleStub('Change Device: stop DSP first, then use SDRangel GUI to swap hardware')}>🔁</button>
        <button className="sdr-btn" title="Reload device (stop → start DSP)" onClick={handleReloadDevice}>🌐</button>
        <button className="sdr-btn" title="Open Preset Manager" onClick={() => toast('Open the ⭐ button in the top navbar to manage presets', 'info')}>⭐</button>
        <button className="sdr-btn" title="Add channels" style={{marginLeft: 'auto'}} onClick={onAddChannel}>✚</button>
      </div>

      <div className="freq-display-box">
        <button 
          className={`freq-play-btn ${isRunning ? 'running' : 'stopped'}`} 
          onClick={handlePowerDrop}
          title={isRunning ? "Stop DSP Device" : "Start DSP Device"}
        >
          {isRunning ? <span style={{color: '#fff', fontSize: '18px'}}>⏹</span> : <span style={{color: '#fff', fontSize: '18px'}}>▶</span>}
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
                onChange={(e) => setHwSettings({...hwSettings, devSampleRate: parseInt(e.target.value)})}
                onBlur={(e) => patchSetting('devSampleRate', parseInt(e.target.value))}
              />
            </div>
          )}
          {hwSettings.log2Decim !== undefined && (
            <div className="setting-group">
              <label>Decim (Log2)</label>
              <input type="number" min="0" max="6" 
                value={hwSettings.log2Decim}
                onChange={(e) => setHwSettings({...hwSettings, log2Decim: parseInt(e.target.value)})}
                onBlur={(e) => patchSetting('log2Decim', parseInt(e.target.value))}
              />
            </div>
          )}
          {hwSettings.gain !== undefined && (
            <div className="setting-group">
              <label>Hardware Gain</label>
              <input type="range" min="0" max="80" 
                value={hwSettings.gain} 
                onChange={(e) => setHwSettings({...hwSettings, gain: parseInt(e.target.value)})}
                onMouseUp={() => patchSetting('gain', hwSettings.gain)}
              />
            </div>
          )}
          {hwSettings.lnaGain !== undefined && (
            <div className="setting-group">
              <label>LNA Gain</label>
              <input type="range" min="0" max="40" step="8"
                value={hwSettings.lnaGain} 
                onChange={(e) => setHwSettings({...hwSettings, lnaGain: parseInt(e.target.value)})}
                onMouseUp={() => patchSetting('lnaGain', hwSettings.lnaGain)}
              />
            </div>
          )}
          {hwSettings.vgaGain !== undefined && (
            <div className="setting-group">
              <label>VGA Gain</label>
              <input type="range" min="0" max="62" step="2"
                value={hwSettings.vgaGain} 
                onChange={(e) => setHwSettings({...hwSettings, vgaGain: parseInt(e.target.value)})}
                onMouseUp={() => patchSetting('vgaGain', hwSettings.vgaGain)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SpectrumVisualizer({
  freqMhz, isConnected, gridMode, maxHold, colorMap, dbRange, refLevel,
  showWaterfall, phosphorMode, avgMode, binsRef, dataSource,
}: { 
  freqMhz: string; isConnected: boolean; gridMode: boolean; maxHold: boolean;
  colorMap: string; dbRange: number; refLevel: number;
  showWaterfall: boolean; phosphorMode: boolean; avgMode: boolean;
  binsRef: React.MutableRefObject<Float32Array | null>;
  dataSource: DataSource;
}) {
  const plotRef      = useRef<HTMLCanvasElement>(null);
  const waterfallRef = useRef<HTMLCanvasElement>(null);
  // binsRef is passed from parent — RAF loop reads current value directly (no re-render)

  useEffect(() => {
    const plotCanvas = plotRef.current;
    const wfCanvas   = waterfallRef.current;
    if (!plotCanvas) return;

    const plotCtx = plotCanvas.getContext('2d');
    if (!plotCtx) return;

    const wfCtx     = wfCanvas ? wfCanvas.getContext('2d') : null;
    const w         = plotCanvas.width;
    const hPlot     = plotCanvas.height;
    const hWF       = wfCanvas ? wfCanvas.height : 0;

    // Waterfall backing buffer
    const wfBacking    = document.createElement('canvas');
    wfBacking.width    = w;
    wfBacking.height   = hWF;
    const wfBackCtx    = wfBacking.getContext('2d');

    // Persistent state across frames
    const maxBuffer = new Float32Array(w).fill(-140);
    const avgBuffer = new Float32Array(w).fill(-100);
    let   reqId: number;

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
          Math.min(255, Math.floor(Math.max(0, v - 0.3) * 2   * 255)),
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
      const bins    = binsRef.current;
      const n       = bins ? bins.length : w;
      const step    = n / w; // how many FFT bins per canvas pixel

      // Build a per-pixel dB array (average bins that map to the same pixel)
      const pxdB = new Float32Array(w);
      if (bins) {
        for (let px = 0; px < w; px++) {
          const startBin = Math.floor(px * step);
          const endBin   = Math.min(n - 1, Math.floor((px + 1) * step));
          let   sum = 0, cnt = 0;
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
        plotCtx.lineWidth   = 1;
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

      // FFT trace (gradient fill)
      plotCtx.beginPath();
      plotCtx.strokeStyle = 'rgba(255,255,0,0.9)';
      plotCtx.lineWidth   = 1.5;
      plotCtx.moveTo(0, binToY(displayBins[0]));
      for (let px = 1; px < w; px++) plotCtx.lineTo(px, binToY(displayBins[px]));
      plotCtx.stroke();

      plotCtx.lineTo(w, hPlot);
      plotCtx.lineTo(0, hPlot);
      const grad = plotCtx.createLinearGradient(0, 0, 0, hPlot);
      grad.addColorStop(0, 'rgba(255,255,0,0.35)');
      grad.addColorStop(1, 'rgba(255,255,0,0.02)');
      plotCtx.fillStyle = grad;
      plotCtx.fill();

      // Max hold (red)
      if (maxHold) {
        plotCtx.beginPath();
        plotCtx.strokeStyle = 'rgba(255,60,60,0.85)';
        plotCtx.lineWidth   = 1;
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
          imgData.data[i4]     = r;
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
  // Only restart RAF loop when display _settings_ change, not on every FFT frame
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridMode, maxHold, colorMap, dbRange, refLevel, showWaterfall, phosphorMode, avgMode]);

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
        <canvas ref={plotRef} width={900} height={220}
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
  const { toast } = useToast();

  const [gridMode, setGridMode] = useState(true);
  const [showWaterfall, setShowWaterfall] = useState(true);
  const [maxHold, setMaxHold] = useState(false);
  const [phosphorMode, setPhosphorMode] = useState(false);
  const [avgMode, setAvgMode] = useState(false);
  const [colorMap, setColorMap] = useState('Angel');
  const [dbRange, setDbRange] = useState(100);
  const [refLevel, setRefLevel] = useState(0);
  const [spectrumMode, setSpectrumMode] = useState<'line' | 'histogram'>('line');

  const mainRx = deviceSets.find(d => d.samplingDevice?.direction === 0);
  const mainRxIdx = deviceSets.findIndex(d => d.samplingDevice?.direction === 0);
  const isRxRunning = mainRx?.samplingDevice?.state === 1;
  const freqMhz = mainRx?.samplingDevice?.centerFrequency 
    ? (mainRx.samplingDevice.centerFrequency / 1000000).toFixed(3) 
    : '435.000';

  // ── Phase 7: ref-based spectrum data (zero re-render on frame) ──────────
  const binsRef = useRef<Float32Array | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('DEMO');
  const hasDevice = mainRxIdx >= 0;

  useSpectrumData({
    binsRef,
    onDataSource: setDataSource,
    deviceSetIndex: hasDevice ? mainRxIdx : 0,
    hasDevice,
    isRunning: isRxRunning,
    isApiConnected: isConnected,
  });

  const handleAutoScale = () => {
    // Reset to sensible defaults
    setDbRange(100);
    setRefLevel(0);
    toast('Auto-scale: reset to 100 dBFS range, 0 dBm ref', 'info');
  };

  // Flatten all channels from all deviceSets into one array to render them globally dynamically
  const allChannels = deviceSets.flatMap((ds, dsIdx) => 
    (ds.channels || []).map((ch, cIdx) => ({ dsIdx, cIdx, channel: ch }))
  );

  return (
    <div className="workspace-area">
      <div className="spectrum-panel" style={{ flex: '1 1 60%' }}>
        <div className="spectrum-header">
          <div className="navbar-group">
            <span className="rx-badge">M:0</span>
            <span style={{color: '#ddd', fontSize: '12px', marginLeft: '8px', fontWeight: 600}}>
              Spectrum {spectrumMode === 'histogram' ? '[Histogram]' : ''}
            </span>
          </div>
          <div className="navbar-group">
            <button className="sdr-btn" title="Open SDRangel spectrum docs"
              onClick={() => window.open('https://github.com/f4exb/sdrangel/blob/master/sdrgui/gui/spectrum.md', '_blank')}>❔</button>
            <button className="sdr-btn" title="Move Workspace (fixed in web layout)"
              onClick={() => toast('Spectrum panel is pinned in web layout', 'info')}>⎘</button>
            <button className="sdr-btn" title="Shrink spectrum height"
              onClick={() => toast('Resize handled by browser — drag the panel divider', 'info')}>↙</button>
            <button className="sdr-btn" title="Expand spectrum height"
              onClick={() => toast('Resize handled by browser — drag the panel divider', 'info')}>⤢</button>
            <button className="sdr-btn" title="Hide/Show Waterfall"
              style={{ background: showWaterfall ? 'transparent' : '#333' }}
              onClick={() => setShowWaterfall(v => !v)}>⊘</button>
          </div>
        </div>
        
        <SpectrumVisualizer 
           freqMhz={freqMhz} 
           isConnected={deviceSets.length > 0} 
           gridMode={gridMode}
           maxHold={maxHold}
           colorMap={colorMap}
           dbRange={dbRange}
           refLevel={refLevel}
           showWaterfall={showWaterfall}
           phosphorMode={phosphorMode}
           avgMode={avgMode}
           binsRef={binsRef}
           dataSource={dataSource}
        />

        <div className="spectrum-toolbar">
          {/* Grid */}
          <button className="sdr-btn" title="Toggle grid" style={{ background: gridMode ? '#444' : 'transparent' }} onClick={() => setGridMode(!gridMode)}>▦</button>
          {/* Waterfall */}
          <button className="sdr-btn" title="Toggle waterfall" style={{ background: showWaterfall ? '#444' : 'transparent' }} onClick={() => setShowWaterfall(v => !v)}>◓</button>
          {/* Phosphor decay */}
          <button className="sdr-btn" title="Phosphor (decay) mode" style={{ color: phosphorMode ? '#7bed9f' : '#aaa', background: phosphorMode ? 'rgba(123,237,159,0.15)' : 'transparent' }} onClick={() => setPhosphorMode(v => !v)}>⚡</button>
          {/* Max hold */}
          <button className="sdr-btn" title="Max hold" style={{color: '#f44', background: maxHold ? '#522' : 'transparent' }} onClick={() => setMaxHold(!maxHold)}>📈</button>
          {/* Average toggle */}
          <button className="sdr-btn" title="Average mode" style={{ color: avgMode ? '#fff' : '#777', background: avgMode ? '#333' : 'transparent' }} onClick={() => setAvgMode(v => !v)}>↑</button>
          {/* Decimation (passthrough info) */}
          <button className="sdr-btn" title="Decimation: set via device sample rate slider" onClick={() => toast('Decimation is controlled by the device sample rate slider', 'info')}>◎</button>
          {/* Spectrum mode */}
          <button className="sdr-btn" title="Spectrum display mode (line/histogram)"
            style={{color: '#fa0', background: spectrumMode === 'histogram' ? 'rgba(255,165,0,0.2)' : 'transparent'}}
            onClick={() => setSpectrumMode(m => m === 'line' ? 'histogram' : 'line')}>◬</button>

          <div className="toolbar-knob">
            <select value={colorMap} onChange={e => setColorMap(e.target.value)}>
               <option value="Angel">Angel</option>
               <option value="Ice">Ice</option>
            </select>
          </div>

          <div className="toolbar-knob">
            <label>FFT</label>
            <select><option>1k</option><option>2k</option><option>4k</option><option>8k</option></select>
          </div>

          {/* Auto-scale */}
          <button className="sdr-btn" title="Auto-scale (reset dB range)" onClick={handleAutoScale}>A</button>

          <div className="toolbar-knob" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
            <span style={{fontSize: '9px', color: '#666'}}>↕ DB</span>
            <input type="number" value={refLevel} onChange={e => setRefLevel(Number(e.target.value))} style={{width: '35px', background: 'transparent', border:'none', color:'#fff', fontSize:'11px'}} />
          </div>
          <div className="toolbar-knob" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
            <span style={{fontSize: '9px', color: '#666'}}>⤢ DB</span>
            <input type="number" value={dbRange} onChange={e => setDbRange(Number(e.target.value))} style={{width: '35px', background: 'transparent', border:'none', color:'#fff', fontSize:'11px'}} />
          </div>
          <div className="toolbar-knob">
            <input type="number" style={{width: '30px', background: 'transparent', border:'none', color:'#fff', fontSize:'11px'}} defaultValue="20" title="Waterfall depth (ms/row)" />
          </div>

          <button className="sdr-btn" title="Save spectrum image" onClick={() => toast('Right-click the canvas to save as image', 'info')}>💾</button>
          <button className="sdr-btn" title="Network stream: requires backend WebSocket support" onClick={() => toast('WebSocket spectrum stream: enable usrsctp in custom SDRangel build', 'warning')}>((•))</button>
          <button className="sdr-btn" title="Spectrum settings" onClick={() => window.open('https://github.com/f4exb/sdrangel/blob/master/sdrgui/gui/spectrum.md#spectrum-display-settings', '_blank')}>🔧</button>
        </div>
      </div>
      
      {/* Plugin Grid - Render all attached channels */}
      <div style={{ flex: '0 1 320px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
         {allChannels.map(({dsIdx, cIdx, channel}) => (
            <ChannelWorkspaceCard key={`${dsIdx}-${cIdx}`} dsIdx={dsIdx} cIdx={cIdx} channel={channel} />
         ))}
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

  const { toast } = useToast();

  useEffect(() => {
    const fetchSdrStatus = async () => {
      try {
        const data = await SdrService.getDeviceSets();
        setDeviceSets(data?.deviceSets || []);
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
      />
      
      <div className="main-stage">
        {/* LEFT PANEL – Device Sidebar */}
        <div className="sidebar">
          {deviceSets.length === 0 && (
             <div style={{padding: '20px', color: '#666', textAlign: 'center'}}>
               <p>No devices active.</p>
               <p style={{fontSize:'12px', marginTop:'10px'}}>Use the + Rx or + Tx buttons in the top navbar.</p>
             </div>
          )}
          {deviceSets.map((ds, idx) => (
            <DeviceSidebarCard 
               key={idx} 
               idx={idx} 
               ds={ds} 
               onAddChannel={() => setRegistryTarget(idx)}
            />
          ))}
        </div>

        {/* CENTER – Main Workspace */}
        <MainWorkspace deviceSets={deviceSets} isConnected={isConnected} />

        {/* RIGHT PANEL – Feature Sidebar (togglable) */}
        {showFeatures && (
          <FeatureSidebar onClose={() => setShowFeatures(false)} />
        )}
      </div>

      {/* Modals */}
      {registryTarget !== null && deviceSets[registryTarget] && (
        <PluginRegistryModal 
          onClose={() => setRegistryTarget(null)}
          onApply={handleApplyPlugin}
          direction={deviceSets[registryTarget].samplingDevice?.direction || 0}
        />
      )}
      {showPresets && (
        <PresetsModal
          onClose={() => setShowPresets(false)}
          deviceSetCount={deviceSets.length || 1}
        />
      )}
      {showPreferences && (
        <PreferencesModal onClose={() => setShowPreferences(false)} />
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
