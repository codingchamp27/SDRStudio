export function StatusBar({ deviceSets, loading, mode }: { deviceSets: any[], loading: boolean, mode: 'tx' | 'rx' }) {
  const txDs = deviceSets.filter(d => d.samplingDevice?.direction === 1);
  const rxDs = deviceSets.filter(d => d.samplingDevice?.direction === 0);

  const usrpConnected = deviceSets.length > 0;
  const txRunning = txDs.some(d => d.samplingDevice?.state === 1 || d.samplingDevice?.state === 'running');
  const rxRunning = rxDs.some(d => d.samplingDevice?.state === 1 || d.samplingDevice?.state === 'running');
  const hasTxChannel = txDs.some(d => d.channelcount > 0);
  const hasRxChannel = rxDs.some(d => d.channelcount > 0);

  const dot = (ok: boolean, on: string, off: string) => (
    <span style={{ color: ok ? '#2ed573' : '#ff4757', marginLeft: 8, fontWeight: 500 }}>
      {ok ? `● ${on}` : `⨯ ${off}`}
    </span>
  );

  return (
    <div className="status-bar-box">
      <div style={{ display: 'flex', gap: '30px', fontSize: '12px' }}>
        <div>USRP{dot(usrpConnected, 'Connected', 'Disconnected')}</div>
        {mode === 'tx' ? (
          <>
            <div>Tx Engine{dot(txRunning, 'Running', 'Idle')}</div>
            <div>Tx Channel{dot(hasTxChannel, 'Active', 'None')}</div>
          </>
        ) : (
          <>
            <div>Rx Engine{dot(rxRunning, 'Running', 'Idle')}</div>
            <div>Rx Channel{dot(hasRxChannel, 'Active', 'None')}</div>
          </>
        )}
      </div>
      <div style={{ color: '#555', fontWeight: 'normal', fontSize: '11px' }}>
        {loading ? '⌛ Syncing...' : mode === 'tx' ? '📡 Transmitter Active' : '📻 Receiver Active'}
      </div>
    </div>
  );
}
