import React, { useEffect, useState } from 'react';
import { Cpu, Radio, Zap, Activity, Server } from 'lucide-react';
import { getInstanceSummary, type InstanceSummary } from '../api';

interface DashboardProps {
  connected: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ connected }) => {
  const [summary, setSummary] = useState<InstanceSummary | null>(null);

  useEffect(() => {
    if (!connected) return;
    getInstanceSummary().then(setSummary).catch(() => {});
  }, [connected]);

  const deviceSets = summary?.devicesetlist?.deviceSets ?? [];
  const rxSets = deviceSets.filter(d => d.samplingDevice?.direction === 0).length;
  const txSets = deviceSets.filter(d => d.samplingDevice?.direction === 1).length;
  const totalChannels = deviceSets.reduce((acc, d) => acc + (d.channelcount ?? 0), 0);

  const statCards = [
    { icon: Server,   label: 'API Version',    value: summary?.version ?? '—',  color: '#00d4ff' },
    { icon: Cpu,      label: 'Device Sets',    value: deviceSets.length,         color: '#a855f7' },
    { icon: Radio,    label: 'RX / TX',        value: `${rxSets} / ${txSets}`,  color: '#00ff88' },
    { icon: Zap,      label: 'Total Channels', value: totalChannels,             color: '#ffaa00' },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeInUp 0.35s ease' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8f0fe' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#4a5a7a', marginTop: 4 }}>
          {connected ? 'SDRangel backend is connected and running.' : 'Backend is offline. Start sdrangelsrv to connect.'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid-2" style={{ gap: 14 }}>
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: `${color}1a`,
              border: `1px solid ${color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 600, color }}>{value}</div>
              <div style={{ fontSize: 11, color: '#4a5a7a', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Device list */}
      {deviceSets.length > 0 && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <span className="section-title">Active Device Sets</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deviceSets.map((ds, i) => {
              const hw = ds.samplingDevice?.hwType ?? 'Unknown';
              const dir = ds.samplingDevice?.direction === 1 ? 'tx' : 'rx';
              const freq = ds.samplingDevice?.centerFrequency;
              const state = ds.samplingDevice?.state ?? 'idle';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <Activity size={14} color={state === 'running' ? '#00ff88' : '#4a5a7a'} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#e8f0fe', flex: 1 }}>{hw || 'No Device'}</span>
                  <span className={`badge badge-${dir}`}>{dir.toUpperCase()}</span>
                  {freq != null && (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#4a5a7a' }}>
                      {(freq / 1e6).toFixed(3)} MHz
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!connected && (
        <div className="glass-card empty-state">
          <Server size={42} />
          <p>Start SDRangel server to see live data<br />
            <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#00d4ff', background: 'rgba(0,212,255,0.08)', padding: '2px 8px', borderRadius: 4, marginTop: 8, display: 'inline-block' }}>./sdrangelsrv</code>
          </p>
        </div>
      )}
    </div>
  );
};
