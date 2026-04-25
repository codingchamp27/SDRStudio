import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DevicesView } from './components/DevicesView';
import { ChannelsView } from './components/ChannelsView';
import { SpectrumPanel } from './components/SpectrumPanel';
import { getInstanceSummary, type InstanceSummary } from './api';
import { Radio, GitBranch, ExternalLink } from 'lucide-react';

const About = () => (
  <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600, animation: 'fadeInUp 0.35s ease' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 52, height: 52,
        background: 'linear-gradient(135deg, #00d4ff, #0066aa)',
        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 20px rgba(0,212,255,0.4)',
      }}>
        <Radio size={26} color="#000" />
      </div>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>SDRStudio</h1>
        <p style={{ fontSize: 13, color: '#4a5a7a' }}>Custom SDR Control Dashboard</p>
      </div>
    </div>
    <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#8899bb', lineHeight: 1.7 }}>
        SDRStudio is a modern web-based control interface for the <strong style={{ color: '#e8f0fe' }}>SDRangel</strong> backend.
        It communicates entirely via the SDRangel REST API at <code style={{ color: '#00d4ff', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>http://localhost:8091</code>.
      </p>
      <div className="divider" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['Backend',  'SDRangel (C++ / Qt5)'],
          ['Frontend', 'React 19 + Vite + TypeScript'],
          ['Hardware', 'NI-USRP (via UHD), and 20+ other SDR devices'],
          ['API',      'SDRangel REST API (Swagger)'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#4a5a7a', width: 80, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
            <span style={{ fontSize: 13, color: '#e8f0fe', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
          </div>
        ))}
      </div>
      <div className="divider" />
      <div style={{ display: 'flex', gap: 10 }}>
        <a href="https://github.com/f4exb/sdrangel" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
          <GitBranch size={13} /> SDRangel GitHub
        </a>
        <a href="https://github.com/f4exb/sdrangel/wiki" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
          <ExternalLink size={13} /> Wiki
        </a>
      </div>
    </div>
  </div>
);

function App() {
  const [view, setView] = useState('dashboard');
  const [connected, setConnected] = useState(false);
  const [version, setVersion] = useState('');
  const [latency, setLatency] = useState<number | null>(null);

  const poll = useCallback(async () => {
    const t0 = Date.now();
    try {
      const data: InstanceSummary = await getInstanceSummary();
      setConnected(true);
      setVersion(data.version ?? '');
      setLatency(Date.now() - t0);
    } catch {
      setConnected(false);
      setLatency(null);
    }
  }, []);

  // Poll every 4 seconds
  useEffect(() => {
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [poll]);

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard connected={connected} />;
      case 'devices':   return <DevicesView />;
      case 'channels':  return <ChannelsView />;
      case 'spectrum':  return <SpectrumPanel connected={connected} />;
      case 'about':     return <About />;
      default:          return <Dashboard connected={connected} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar connected={connected} version={version} latency={latency} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar active={view} onNavigate={setView} />
        <main style={{ flex: 1, overflow: 'auto', background: 'radial-gradient(ellipse at top left, rgba(0,100,150,0.06) 0%, transparent 60%)' }}>
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default App;
