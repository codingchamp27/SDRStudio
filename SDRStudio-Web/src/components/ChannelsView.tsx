import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Sliders, X } from 'lucide-react';
import { getDeviceSets, getChannels, addChannel, deleteChannel, getChannelPlugins, type DeviceSet, type Channel, type ChannelPlugin } from '../api';
import { VideoPanel } from './VideoPanel';
import { ReceiverPanel } from './ReceiverPanel';

export const ChannelsView: React.FC = () => {
  const [deviceSets, setDeviceSets] = useState<DeviceSet[]>([]);
  const [channelsByDev, setChannelsByDev] = useState<Record<number, Channel[]>>({});
  const [plugins, setPlugins] = useState<ChannelPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState<{ devIndex: number; direction: 0 | 1 } | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ds = await getDeviceSets();
      const sets = ds.deviceSets ?? [];
      setDeviceSets(sets);

      const channelMap: Record<number, Channel[]> = {};
      await Promise.all(sets.map(async (s) => {
        const idx = s.devicesetIndex ?? 0;
        const ch = await getChannels(idx);
        channelMap[idx] = ch.channels ?? [];
      }));
      setChannelsByDev(channelMap);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openAddModal = async (ds: DeviceSet) => {
    const dir = ds.samplingDevice?.direction === 1 ? 1 : 0;
    setAddModal({ devIndex: ds.devicesetIndex ?? 0, direction: dir });
    setSelectedPlugin('');
    try {
      const pluginData = await getChannelPlugins(dir);
      setPlugins(pluginData.channels ?? []);
    } catch { setPlugins([]); }
  };

  const handleAddChannel = async () => {
    if (!addModal || !selectedPlugin) return;
    try {
      await addChannel(addModal.devIndex, selectedPlugin, addModal.direction);
      setAddModal(null);
      refresh();
    } catch { /* ignore */ }
  };

  const handleDeleteChannel = async (devIndex: number, ch: Channel) => {
    try { await deleteChannel(devIndex, ch.index ?? 0); refresh(); } catch { /* ignore */ }
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', animation: 'fadeInUp 0.35s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Channels</h1>
        <p style={{ fontSize: 13, color: '#4a5a7a', marginTop: 4 }}>Demodulators, modulators, and signal processing plugins</p>
      </div>

      {loading && <div style={{ display: 'flex', gap: 10, color: '#4a5a7a', alignItems: 'center' }}><span className="spinner" /> Loading...</div>}

      {!loading && deviceSets.length === 0 && (
        <div className="glass-card empty-state"><Sliders size={40}/><p>No device sets found. Add a device first.</p></div>
      )}

      {/* Add channel modal */}
      {addModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setAddModal(null)}>
          <div className="glass-card" style={{ padding: 24, width: 380, maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600 }}>Add Channel to Device Set {addModal.devIndex + 1}</span>
              <button className="btn-icon" onClick={() => setAddModal(null)}><X size={14}/></button>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Channel Plugin</label>
              <select className="form-select" value={selectedPlugin} onChange={e => setSelectedPlugin(e.target.value)}>
                <option value="">— Select —</option>
                {plugins.map(p => <option key={p.pluginIdHex} value={p.displayedName}>{p.displayedName}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" disabled={!selectedPlugin} onClick={handleAddChannel}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAddModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Per-device channel lists */}
      {!loading && deviceSets.map(ds => {
        const idx = ds.devicesetIndex ?? 0;
        const channels = channelsByDev[idx] ?? [];
        const dir = ds.samplingDevice?.direction === 1 ? 'TX' : 'RX';
        const hw = ds.samplingDevice?.hwType ?? 'No Device';
        return (
          <div key={idx} className="glass-card" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#e8f0fe' }}>Device Set {idx + 1}: {hw}</span>
                <span className={`badge badge-${dir === 'TX' ? 'tx' : 'rx'}`}>{dir}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => openAddModal(ds)}>
                <Plus size={13}/> Add Channel
              </button>
            </div>
            {channels.length === 0 ? (
              <div style={{ color: '#4a5a7a', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No channels. Click "Add Channel" to add one.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {channels.map((ch, ci) => (
                  <div key={ci} style={{
                    display: 'flex', flexDirection: 'column', gap: 8,
                    padding: '9px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Sliders size={14} color="#4a5a7a" />
                      <span style={{ flex: 1, fontSize: 13, color: '#e8f0fe', fontFamily: 'JetBrains Mono, monospace' }}>
                        {ch.title ?? `Channel ${ch.index}`}
                      </span>
                      {ch.deltaFrequency != null && (
                        <span style={{ fontSize: 11, color: '#4a5a7a', fontFamily: 'JetBrains Mono, monospace' }}>
                          Δ{(ch.deltaFrequency / 1e3).toFixed(1)} kHz
                        </span>
                      )}
                      <button className="btn-icon" style={{ color: '#ff4466', borderColor: 'rgba(255,68,102,0.2)' }}
                        onClick={() => handleDeleteChannel(idx, ch)} title="Remove">
                        <X size={13}/>
                      </button>
                    </div>

                    {ch.id?.includes('DATVMod') && (
                      <div className="glass-card" style={{ padding: 0, marginTop: 4 }}>
                        <VideoPanel deviceSets={deviceSets} />
                      </div>
                    )}
                    {ch.id?.includes('DATVDemod') && (
                      <div className="glass-card" style={{ padding: 0, marginTop: 4 }}>
                        <ReceiverPanel deviceSets={deviceSets} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
