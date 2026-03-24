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
  };
}

function App() {
  const [deviceSets, setDeviceSets] = useState<DeviceSet[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Poll the backend API
  useEffect(() => {
    const fetchSdrStatus = async () => {
      try {
        const data = await SdrService.getDeviceSets();
        setDeviceSets(data?.deviceSets || []);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setIsConnected(false);
        setError("SDRangel backend unreachable. Start it with 'sdrsrv'.");
      } finally {
        setLoading(false);
      }
    };

    fetchSdrStatus();
    // Poll every 3 seconds to emulate real-time dash
    const interval = setInterval(fetchSdrStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      {/* Premium Glass Header */}
      <header className="app-header glass-header">
        <div className="logo-container">
          <div className="logo-icon"></div>
          <h1>SDRStudio <span className="logo-highlight">Web</span></h1>
        </div>
        
        <div className="status-container">
          <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></div>
          <span className="status-text">
            {loading ? 'Connecting...' : (isConnected ? 'Engine Online' : 'Engine Offline')}
          </span>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="dashboard">
        <section className="hero-section">
          <h2 className="animate-fade-in">System Control Center</h2>
          <p className="subtitle animate-fade-in" style={{animationDelay: '0.1s'}}>
            Manage your decoupled C++ DSP transmission and receiving array from this high-performance React UI.
          </p>
        </section>

        {error && (
          <div className="error-banner glass-panel animate-fade-in">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <h3>Connection Failed</h3>
              <p>{error}</p>
            </div>
            <button className="btn btn-outline" onClick={() => setLoading(true)}>Retry</button>
          </div>
        )}

        {/* Dynamic Device Grid */}
        <div className="device-grid">
          {/* Mock empty state if connected but no devices active */}
          {isConnected && deviceSets.length === 0 && (
             <div className="empty-state glass-panel">
               <div className="empty-icon">📻</div>
               <h3>No Active Devices</h3>
               <p>Initialize a Receiver (Rx) or Transmitter (Tx) plugin to begin.</p>
               <div className="action-buttons">
                  <button className="btn btn-primary" onClick={() => SdrService.createDeviceSet(0)}>+ Add Rx</button>
                  <button className="btn btn-secondary" onClick={() => SdrService.createDeviceSet(1)}>+ Add Tx</button>
               </div>
             </div>
          )}

          {/* Render connected devices */}
          {deviceSets.map((ds, idx) => (
            <div key={idx} className="device-card glass-panel float-anim">
              <div className="card-header">
                <h3>{ds.samplingDevice?.tx ? 'Tx' : 'Rx'} Workspace {idx}</h3>
                <span className="badge">{ds.samplingDevice?.hwType || 'No Hardware'}</span>
              </div>
              
              <div className="freq-display">
                <span className="freq-value">
                  {((ds.samplingDevice?.centerFrequency || 433000000) / 1000000).toFixed(3)}
                </span>
                <span className="freq-unit">MHz</span>
              </div>

              <div className="plugin-stats">
                <div className="stat-item">
                  <span className="stat-label">Active Plugins</span>
                  <span className="stat-value">{ds.channelrx || ds.channeltx || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Status</span>
                  <span className="stat-value success-text">Running</span>
                </div>
              </div>

              <div className="card-actions">
                <button className="btn btn-primary full-width">Configure Device</button>
              </div>
            </div>
          ))}

          {/* Demonstration Card (Always visible to show UI during mock mode) */}
          {!isConnected && !loading && (
             <div className="device-card glass-panel mock-card float-anim">
                <div className="card-header">
                  <h3>Rx Workspace (Preview)</h3>
                  <span className="badge active">RTL-SDR</span>
                </div>
                
                <div className="freq-display interactive">
                  <span className="freq-value">100.200</span>
                  <span className="freq-unit">MHz</span>
                </div>

                <div className="visualizer-mock">
                   <div className="bar bar-1"></div>
                   <div className="bar bar-2"></div>
                   <div className="bar bar-3"></div>
                   <div className="bar bar-4"></div>
                   <div className="bar bar-5"></div>
                   <div className="bar bar-6"></div>
                   <div className="bar bar-7"></div>
                   <div className="bar bar-8"></div>
                   <div className="bar bar-9"></div>
                </div>

                <div className="plugin-stats">
                  <div className="stat-item">
                    <span className="stat-label">Plugin</span>
                    <span className="stat-value">WFM Demod</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Gain</span>
                    <span className="stat-value">40.2 dB</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn btn-primary full-width disabled">Waiting for Engine...</button>
                </div>
              </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
