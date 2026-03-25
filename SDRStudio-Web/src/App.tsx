import { useState, useEffect } from 'react';
import { SdrService } from './api';
import './App.css';

interface DeviceSet {
  channelrx?: number;
  channeltx?: number;
  samplingDevice?: {
    hwType: string;
    tx: number;
    centerFrequency: number;
    state: number;
  };
}

function TopNavbar({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="top-navbar">
      <div className="navbar-group">
        <button className="sdr-btn">W0</button>
        <button className="sdr-btn">⭐</button>
      </div>
      <div className="nav-divider"></div>
      
      <div className="navbar-group">
        <button className="sdr-btn danger" onClick={() => SdrService.createDeviceSet(0)}>✚ Rx</button>
        <button className="sdr-btn success" onClick={() => SdrService.createDeviceSet(1)}>✚ Tx</button>
        <button className="sdr-btn" title="Start All">▶</button>
        <button className="sdr-btn" title="Stop All">⏹</button>
      </div>
      <div className="nav-divider"></div>

      <div className="navbar-group">
        <button className="sdr-btn">⚙️</button>
        <button className="sdr-btn">📡</button>
        <button className="sdr-btn">🎛️</button>
        <button className="sdr-btn">📊</button>
      </div>
      <div className="nav-divider"></div>

      <div className="navbar-group">
        <button className="sdr-btn">📁</button>
        <button className="sdr-btn">💾</button>
      </div>

      <div style={{ flex: 1 }}></div>

      <div className="navbar-group">
        <span style={{ fontSize: '12px', color: isConnected ? '#2ed573' : '#ff4757', marginRight: '10px' }}>
          {isConnected ? 'SDRangel API Connected' : 'Disconnected'}
        </span>
        <button className="sdr-btn">🪟</button>
      </div>
    </div>
  );
}

function DeviceSidebarCard({ idx, ds }: { idx: number, ds: DeviceSet }) {
  const [isTuning, setIsTuning] = useState(false);
  const [freqInput, setFreqInput] = useState("");
  const hw = ds.samplingDevice;
  const isRunning = hw?.state === 1;

  useEffect(() => {
    if (!isTuning) {
      setFreqInput((hw?.centerFrequency || 0).toLocaleString());
    }
  }, [hw?.centerFrequency, isTuning]);

  const handleApplyFreq = async () => {
    setIsTuning(false);
    const hzStr = freqInput.replace(/,/g, '');
    const hz = parseInt(hzStr, 10);
    if (!isNaN(hz) && hw) {
      try {
        const settings = await SdrService.getDeviceSettings(idx);
        const hwKey = Object.keys(settings).find(k => k.endsWith('Settings'));
        if (hwKey && settings[hwKey]) {
          settings[hwKey].centerFrequency = hz;
          await SdrService.patchDeviceSettings(idx, settings);
        }
      } catch (err) {
        console.error("Failed to set frequency", err);
      }
    }
  };

  const handlePowerDrop = async () => {
    await SdrService.setDeviceState(idx, isRunning ? 0 : 1);
  };

  return (
    <div className="device-card">
      <div className="device-header">
        <div className="device-header-left">
          <span className={hw?.tx ? 'tx-badge' : 'rx-badge'}>
            {hw?.tx ? 'T' : 'R'}:{idx}
          </span>
          <span className="hw-label">{hw?.hwType || 'No Hardware'}</span>
        </div>
        <div className="navbar-group">
          <button className="sdr-btn">❔</button>
          <button className="sdr-btn">⎘</button>
          <button className="sdr-btn">✖</button>
        </div>
      </div>

      <div className="device-toolbar">
        <button className="sdr-btn">⚙️</button>
        <button className="sdr-btn">🔁</button>
        <button className="sdr-btn">🌐</button>
        <button className="sdr-btn">⭐</button>
      </div>

      <div className="freq-display-box">
        <button 
          className={`freq-play-btn ${isRunning ? 'running' : 'stopped'}`} 
          onClick={handlePowerDrop}
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
          />
          <span className="freq-unit">Hz</span>
        </div>
      </div>

      <div className="device-sub-settings">
        <div className="setting-group">
          <label>Sample Rate</label>
          <select><option>48000 Hz</option><option>192000 Hz</option></select>
        </div>
        <div className="setting-group">
          <label>Decimation</label>
          <select><option>1</option><option>2</option><option>4</option></select>
        </div>
        <div className="setting-group">
          <label>LNA Gain</label>
          <input type="range" min="0" max="40" defaultValue="20" />
        </div>
        <div className="setting-group">
          <label>VGA Gain</label>
          <input type="range" min="0" max="62" defaultValue="40" />
        </div>
      </div>
    </div>
  );
}

function MainWorkspace({ deviceSets }: { deviceSets: DeviceSet[] }) {
  // Use the first Rx device freq for the visualizer mock title
  const mainRx = deviceSets.find(d => d.samplingDevice?.tx === 0);
  const freqMhz = mainRx?.samplingDevice?.centerFrequency 
    ? (mainRx.samplingDevice.centerFrequency / 1000000).toFixed(3) 
    : '435.000';

  return (
    <div className="workspace-area">
      <div className="spectrum-panel">
        <div className="spectrum-header">
          <div className="navbar-group">
            <span className="rx-badge">R:0</span>
            <span style={{color: '#ddd', fontSize: '12px', marginLeft: '8px', fontWeight: 600}}>
              {mainRx?.samplingDevice?.hwType || 'FileInput'}
            </span>
          </div>
          <div className="navbar-group">
            <button className="sdr-btn">❔</button>
            <button className="sdr-btn">⎘</button>
            <button className="sdr-btn">↙</button>
            <button className="sdr-btn">⤢</button>
            <button className="sdr-btn">⊘</button>
          </div>
        </div>
        
        {/* Top Spectrum Form */}
        <div className="spectrum-view">
          <span style={{position:'absolute', top: 4, left: 6, color: '#aaa', fontSize: '10px', zIndex: 10}}>
            CF:{freqMhz}M SP:48.000k
          </span>
          <div className="canvas-mock"></div>
          <div className="spectrum-axis">
            <span>{parseFloat(freqMhz) - 0.020}</span>
            <span>{parseFloat(freqMhz) - 0.010}</span>
            <span>{freqMhz}</span>
            <span>{parseFloat(freqMhz) + 0.010}</span>
            <span>{parseFloat(freqMhz) + 0.020}</span>
          </div>
        </div>

        {/* Bottom Waterfall Form */}
        <div className="spectrum-view" style={{ minHeight: '150px' }}>
          <div className="canvas-mock" style={{opacity: 0.5}}></div>
          <div style={{position: 'absolute', left: 4, top: 4, display: 'flex', flexDirection: 'column', gap: '8px', color: '#666', fontSize: '10px'}}>
             <span>0</span><span>200</span><span>400</span><span>600</span><span>800</span><span>1000</span>
          </div>
        </div>

        {/* Heavy Footer Toolbar */}
        <div className="spectrum-toolbar">
          <button className="sdr-btn">▦</button>
          <button className="sdr-btn">◓</button>
          <button className="sdr-btn">✂</button>
          <button className="sdr-btn">⬛</button>
          <button className="sdr-btn" style={{color: '#0f0'}}>▲</button>
          <button className="sdr-btn" style={{color: '#fff'}}>↑</button>
          <button className="sdr-btn">◎</button>
          <button className="sdr-btn" style={{color: '#fa0'}}>◬</button>
          <button className="sdr-btn">△</button>
          <button className="sdr-btn">◭</button>

          <div className="toolbar-knob">
            <select><option>Angel</option></select>
          </div>

          <div className="toolbar-knob">
            <label>Han</label>
            <select><option>1k</option></select>
          </div>

          <button className="sdr-btn">A</button>

          <div className="toolbar-knob">
            <input type="number" style={{width: '30px', background: 'transparent', border:'none', color:'#fff', fontSize:'11px'}} defaultValue="0" />
          </div>
          <div className="toolbar-knob">
            <input type="number" style={{width: '30px', background: 'transparent', border:'none', color:'#fff', fontSize:'11px'}} defaultValue="100" />
          </div>
          <div className="toolbar-knob">
            <input type="number" style={{width: '30px', background: 'transparent', border:'none', color:'#fff', fontSize:'11px'}} defaultValue="20" />
          </div>

          <button className="sdr-btn">↩</button>
          <button className="sdr-btn">⏸</button>
          <button className="sdr-btn">💾</button>
          <button className="sdr-btn">((•))</button>
          <button className="sdr-btn">⊕</button>
          <button className="sdr-btn">📏</button>
          <button className="sdr-btn">🔧</button>
          <button className="sdr-btn" style={{color: '#fa0'}}>☰</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [deviceSets, setDeviceSets] = useState<DeviceSet[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const fetchSdrStatus = async () => {
      try {
        const data = await SdrService.getDeviceSets();
        setDeviceSets(data?.deviceSets || []);
        setIsConnected(true);
      } catch (err) {
        setIsConnected(false);
      }
    };
    fetchSdrStatus();
    const interval = setInterval(fetchSdrStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sdr-app">
      <TopNavbar isConnected={isConnected} />
      
      <div className="main-stage">
        {/* LEFT PANEL */}
        <div className="sidebar">
          {deviceSets.length === 0 && (
             <div style={{padding: '20px', color: '#666', textAlign: 'center'}}>
               <p>No devices.</p>
               <p style={{fontSize:'12px', marginTop:'10px'}}>Use the + Rx or + Tx buttons in the top navbar.</p>
             </div>
          )}
          {deviceSets.map((ds, idx) => (
            <DeviceSidebarCard key={idx} idx={idx} ds={ds} />
          ))}
        </div>

        {/* RIGHT PANEL (Main Workspace) */}
        <MainWorkspace deviceSets={deviceSets} />
      </div>
    </div>
  );
}

export default App;
