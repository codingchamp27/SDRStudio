import { useState, useEffect } from 'react';
import { SdrService } from './api';
import { ToastProvider } from './ToastContext';
import './App.css';

import { TopNav } from './components/TopNav';
import { StatusBar } from './components/StatusBar';
import { RisStatus } from './components/RisStatus';
import { VideoPanel } from './components/VideoPanel';
import { RisConfig } from './components/RisConfig';
import { SdrLogs } from './components/SdrLogs';
import { RxStatusPanel } from './components/RxStatusPanel';
import { ReceiverPanel } from './components/ReceiverPanel';
import { RxConfigPanel } from './components/RxConfigPanel';

function Dashboard() {
  const [mode, setMode] = useState<'tx' | 'rx'>('tx');
  const [deviceSets, setDeviceSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchState = async () => {
    try {
      const data = await SdrService.getDeviceSets();
      setDeviceSets(data.deviceSets || []);
    } catch { /* Backend offline */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dashboard-container">
      <TopNav mode={mode} onModeChange={setMode} />
      <div className="progress-bar-container">
        <StatusBar deviceSets={deviceSets} loading={loading} mode={mode} />
      </div>

      <div className="grid-info">
        {mode === 'tx' ? (
          <>
            <div className="grid-panel core"><RisStatus /></div>
            <div className="grid-panel ran"><VideoPanel deviceSets={deviceSets} /></div>
            <div className="grid-panel ue"><RisConfig /></div>
            <div className="grid-panel packet"><SdrLogs /></div>
          </>
        ) : (
          <>
            <div className="grid-panel core"><RxStatusPanel deviceSets={deviceSets} /></div>
            <div className="grid-panel ran"><ReceiverPanel deviceSets={deviceSets} /></div>
            <div className="grid-panel ue"><RxConfigPanel deviceSets={deviceSets} onRefresh={fetchState} /></div>
            <div className="grid-panel packet"><SdrLogs /></div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}
