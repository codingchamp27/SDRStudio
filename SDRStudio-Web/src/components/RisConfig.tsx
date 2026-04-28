

export function RisConfig() {
  return (
    <>
      <div className="panel-header">Mantis RIS Config</div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ fontSize: '11px', color: '#888' }}>
          Configuration forms for UE mapping and Network settings.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
           <input type="text" className="sdr-btn" readOnly value="192.168.1.100" style={{flex: 1, background:'#111', cursor:'text', color:'#fff', border:'1px solid #333'}} />
           <button className="btn primary">Ping</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
           <select className="sdr-btn" style={{flex: 1, background:'#111', color:'#fff', border:'1px solid #333'}}>
              <option>Default Template</option>
              <option>High Gain Mode</option>
           </select>
           <button className="btn">Apply</button>
        </div>
      </div>
    </>
  );
}
