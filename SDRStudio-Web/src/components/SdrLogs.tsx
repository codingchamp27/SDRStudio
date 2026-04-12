

export function SdrLogs() {
  return (
    <>
      <div className="panel-header">Packet Status & Logs</div>
      <div className="panel-content" style={{ fontFamily: 'monospace', fontSize: '11px', color: '#ccc', background: '#050505', padding: '12px' }}>
        <div style={{color: '#2ed573'}}>[INFO] Mantis RIS Frontend Initialized.</div>
        <div style={{color: '#aaa'}}>[SYS] Connecting to SDRangel API...</div>
        <div style={{color: '#2ed573'}}>[INFO] API Backend Reachable.</div>
        <div style={{color: '#aaa'}}>[SYS] Awaiting live Tx/Rx streaming commands.</div>
      </div>
    </>
  );
}
