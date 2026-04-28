export function RxStatusPanel({ deviceSets }: { deviceSets: any[] }) {
  const rxDs = deviceSets.filter(d => d.samplingDevice?.direction === 0);
  const ds = rxDs[0];
  const hw = ds?.samplingDevice;
  const ch = ds?.channels?.find((c: any) => c.id?.includes('DATVDemod'));

  return (
    <>
      <div className="panel-header">📻 Receiver Status</div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>
          DATV Demodulator — live signal quality metrics.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="datv-panel" style={{ textAlign: 'center' }}>
            <div style={{ color: '#aaa', fontSize: '11px' }}>Rx Engine</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '6px', color: (hw?.state === 1 || hw?.state === 'running') ? '#2ed573' : '#ff4757' }}>
              {(hw?.state === 1 || hw?.state === 'running') ? 'RUNNING' : 'IDLE'}
            </div>
          </div>
          <div className="datv-panel" style={{ textAlign: 'center' }}>
            <div style={{ color: '#aaa', fontSize: '11px' }}>DATV Ch</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '6px', color: ch ? '#2ed573' : '#666' }}>
              {ch ? 'ACTIVE' : 'NONE'}
            </div>
          </div>
          <div className="datv-panel" style={{ textAlign: 'center' }}>
            <div style={{ color: '#aaa', fontSize: '11px' }}>Center Freq</div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '6px', color: '#f1c40f' }}>
              {hw?.centerFrequency ? `${(hw.centerFrequency / 1e6).toFixed(3)} MHz` : '—'}
            </div>
          </div>
          <div className="datv-panel" style={{ textAlign: 'center' }}>
            <div style={{ color: '#aaa', fontSize: '11px' }}>Sample Rate</div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '6px', color: '#0078d7' }}>
              {hw?.bandwidth ? `${(hw.bandwidth / 1e6).toFixed(1)} MS/s` : '—'}
            </div>
          </div>
        </div>
        {ds && (
          <div className="datv-panel" style={{ fontSize: '11px', color: '#888' }}>
            <div>HW: <span style={{ color: '#ccc' }}>{hw?.hwType || '—'}</span></div>
            <div>Serial: <span style={{ color: '#ccc', wordBreak: 'break-all' }}>{hw?.serial || '—'}</span></div>
          </div>
        )}
        {!ds && (
          <div style={{ textAlign: 'center', color: '#555', fontSize: '13px', marginTop: '8px' }}>
            No Rx device set active.<br />
            <span style={{ fontSize: '11px' }}>Start an SDRangel Rx workspace on port 8091.</span>
          </div>
        )}
      </div>
    </>
  );
}
