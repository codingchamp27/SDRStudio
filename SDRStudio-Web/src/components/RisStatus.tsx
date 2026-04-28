

export function RisStatus() {
  return (
    <>
      <div className="panel-header">Mantis RIS Status</div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ fontSize: '11px', color: '#888' }}>
          Real-time Core network and UE statistics are mapped here.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="datv-panel" style={{textAlign:'center'}}>
             <div style={{color:'#aaa'}}>Core State</div>
             <div style={{fontSize:'16px', color:'#2ed573', fontWeight:600, marginTop:'6px'}}>ACTIVE</div>
          </div>
          <div className="datv-panel" style={{textAlign:'center'}}>
             <div style={{color:'#aaa'}}>UE Link</div>
             <div style={{fontSize:'16px', color:'#2ed573', fontWeight:600, marginTop:'6px'}}>LINKED</div>
          </div>
          <div className="datv-panel" style={{textAlign:'center'}}>
             <div style={{color:'#aaa'}}>Tx Power</div>
             <div style={{fontSize:'16px', color:'#f1c40f', fontWeight:600, marginTop:'6px'}}>-12.0 dBm</div>
          </div>
          <div className="datv-panel" style={{textAlign:'center'}}>
             <div style={{color:'#aaa'}}>Frame Sync</div>
             <div style={{fontSize:'16px', color:'#0078d7', fontWeight:600, marginTop:'6px'}}>LOCKED</div>
          </div>
        </div>
      </div>
    </>
  );
}
