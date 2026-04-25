import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Cpu } from 'lucide-react';
import { getDeviceSets, addDeviceSet, deleteDeviceSet, getAvailableDevices, setDevice, type DeviceSet, type AvailableDevice } from '../api';
import { DeviceCard } from './DeviceCard';

export const DevicesView: React.FC = () => {
  const [deviceSets, setDeviceSets] = useState<DeviceSet[]>([]);
  const [availableDevices, setAvailableDevices] = useState<AvailableDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingDir, setAddingDir] = useState<0 | 1 | null>(null);
  const [selectedHw, setSelectedHw] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([getDeviceSets(), getAvailableDevices()]).then(([ds, avail]) => {
      setDeviceSets(ds.deviceSets ?? []);
      const devices = avail.devices ?? [];
      // Debug: log all detected hardware
      console.log('[SDRStudio] Available devices:', JSON.stringify(devices));
      setAvailableDevices(devices);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAddDeviceSet = async (direction: 0 | 1) => {
    try {
      const result = await addDeviceSet(direction);
      const newIndex = result.devicesetIndex;
      if (selectedHw) {
        // PUT to assign hardware — direction: 0=RX, 1=TX
        await setDevice(newIndex, selectedHw, direction);
      } else if (direction === 1) {
        // TX with no hardware: warn user
        console.warn('[SDRStudio] TX device set created but no hardware selected. It will default to TestMO.');
      }
      setAddingDir(null);
      setSelectedHw('');
      setTimeout(refresh, 500); // small delay to let backend settle
    } catch (err) {
      console.error('[SDRStudio] Failed to add device set:', err);
    }
  };

  const handleDelete = async (index: number) => {
    try { 
      await deleteDeviceSet(index); 
      setTimeout(refresh, 300); // small delay for backend
    } catch (err) { 
      console.error('[SDRStudio] Delete failed:', err);
    }
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeInUp 0.35s ease', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Devices</h1>
          <p style={{ fontSize: 13, color: '#4a5a7a', marginTop: 4 }}>Manage receive and transmit device sets</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={refresh} title="Rescan hardware">
            🔄 Rescan
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setAddingDir(0); setSelectedHw(''); }}>
            <Plus size={14} /> Add RX
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setAddingDir(1); setSelectedHw(''); }}>
            <Plus size={14} /> Add TX
          </button>
        </div>
      </div>

      {/* Add device panel */}
      {addingDir !== null && (
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{
              padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
              background: addingDir === 1 ? 'rgba(255,170,0,0.15)' : 'rgba(0,255,136,0.1)',
              color: addingDir === 1 ? '#ffaa00' : '#00ff88',
              border: `1px solid ${addingDir === 1 ? '#ffaa00' : '#00ff88'}44`,
            }}>
              {addingDir === 1 ? 'TX' : 'RX'}
            </span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              New {addingDir === 0 ? 'Receiver' : 'Transmitter'} Device Set
            </span>
          </div>

          {addingDir === 1 && availableDevices.length === 0 && (
            <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', marginBottom: 12, fontSize: 12, color: '#ffaa00' }}>
              ⚠ No hardware detected. Make sure your USRP is plugged in before starting sdrangelsrv, then click Rescan.
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">
              Hardware Device {addingDir === 1 ? '(required for TX)' : '(optional)'}
            </label>
            <select className="form-select" value={selectedHw} onChange={e => setSelectedHw(e.target.value)}>
              <option value="">— Auto / Use first available —</option>
              {availableDevices.map(d => (
                <option key={`${d.hwType}-${d.serial}`} value={d.hwType}>
                  {d.displayedName} · {d.hwType}
                  {d.serial ? ` · S/N: ${d.serial}` : ''}
                  {' '}
                  {d.direction === 0 ? '[RX only]' : d.direction === 1 ? '[TX only]' : '[RX+TX]'}
                </option>
              ))}
            </select>
            {availableDevices.length === 0 && (
              <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                No devices found — is sdrangelsrv running? Try clicking Rescan.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Pass the current addingDir value as a captured const to avoid stale closure */}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { const d = addingDir; if (d !== null) handleAddDeviceSet(d); }}
            >
              Create {addingDir === 1 ? 'TX' : 'RX'} Device Set
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAddingDir(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#4a5a7a', padding: 16 }}>
          <span className="spinner" /> Loading devices...
        </div>
      )}

      {/* Device grid */}
      {!loading && deviceSets.length === 0 && (
        <div className="glass-card empty-state">
          <Cpu size={40} />
          <p>No device sets yet.<br />Click "Add RX" or "Add TX" to get started.</p>
        </div>
      )}

      {!loading && deviceSets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {deviceSets.map((ds) => (
            <DeviceCard
              key={ds.devicesetIndex}
              ds={ds}
              onDelete={() => handleDelete(ds.devicesetIndex ?? 0)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
