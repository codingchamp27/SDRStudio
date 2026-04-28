export function TopNav({ mode, onModeChange }: { mode: 'tx' | 'rx', onModeChange: (m: 'tx' | 'rx') => void }) {
  return (
    <div style={{
      height: '44px', width: '100%', background: '#0a0a10',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: '0', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: 'auto' }}>
        <span style={{ color: '#0078d7', fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px' }}>
          🛰 Mantis RIS
        </span>
        <span style={{ color: '#444', fontSize: '12px' }}>|</span>
        <span style={{ color: '#666', fontSize: '11px' }}>SDRangel DATV Link</span>
      </div>

      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
        <button
          onClick={() => onModeChange('tx')}
          style={{
            padding: '5px 18px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            background: mode === 'tx' ? '#0078d7' : 'transparent',
            color: mode === 'tx' ? '#fff' : '#888',
            transition: 'all 0.15s',
          }}>
          📡 Transmitter
        </button>
        <button
          onClick={() => onModeChange('rx')}
          style={{
            padding: '5px 18px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            background: mode === 'rx' ? '#2ed573' : 'transparent',
            color: mode === 'rx' ? '#000' : '#888',
            transition: 'all 0.15s',
          }}>
          📻 Receiver
        </button>
      </div>
    </div>
  );
}
