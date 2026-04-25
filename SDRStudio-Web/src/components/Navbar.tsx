import React from 'react';
import { Radio, Activity } from 'lucide-react';

interface NavbarProps {
  connected: boolean;
  version: string;
  latency: number | null;
}

export const Navbar: React.FC<NavbarProps> = ({ connected, version, latency }) => (
  <header style={{
    height: 52,
    background: 'rgba(7,11,20,0.98)',
    borderBottom: '1px solid rgba(0,212,255,0.1)',
    display: 'flex', alignItems: 'center',
    padding: '0 20px', gap: 12,
    flex: '0 0 52px',
    backdropFilter: 'blur(8px)',
    zIndex: 100,
  }}>
    {/* Logo */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 30, height: 30,
        background: 'linear-gradient(135deg, #00d4ff, #0066aa)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 12px rgba(0,212,255,0.4)',
      }}>
        <Radio size={16} color="#000" />
      </div>
      <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: '#e8f0fe' }}>
        SDR<span style={{ color: '#00d4ff' }}>Studio</span>
      </span>
    </div>

    <div style={{ flex: 1 }} />

    {/* Latency */}
    {latency !== null && connected && (
      <span style={{ fontSize: 11, color: '#4a5a7a', fontFamily: 'JetBrains Mono, monospace' }}>
        <Activity size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
        {latency}ms
      </span>
    )}

    {/* Connection badge */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      background: connected ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,102,0.1)',
      border: `1px solid ${connected ? 'rgba(0,255,136,0.25)' : 'rgba(255,68,102,0.25)'}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: connected ? '#00ff88' : '#ff4466',
        boxShadow: connected ? '0 0 6px #00ff88' : '0 0 6px #ff4466',
        animation: connected ? 'pulse 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: connected ? '#00ff88' : '#ff4466' }}>
        {connected ? 'Connected' : 'Offline'}
      </span>
    </div>

    {/* Version */}
    {version && (
      <span style={{
        fontSize: 11, color: '#4a5a7a',
        fontFamily: 'JetBrains Mono, monospace',
        background: 'rgba(255,255,255,0.04)',
        padding: '3px 8px', borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        v{version}
      </span>
    )}
  </header>
);
