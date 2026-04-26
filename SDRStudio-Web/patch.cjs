const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldComponent = `function DeviceSidebarCard({ idx, ds, deviceSetCount, onAddChannel }: { idx: number, ds: DeviceSet, deviceSetCount: number, onAddChannel: () => void }) {
  const [isTuning, setIsTuning] = useState(false);
  const [freqInput, setFreqInput] = useState("");
  const [hwSettings, setHwSettings] = useState<any>(null);
  const { toast } = useToast();`;

const newCode = `function MechanicalDisplay({ value, digits, color = 'orange', suffix = '' }: { value: number, digits: number, color?: 'orange'|'green', suffix?: string }) {
  const str = value.toString().padStart(digits, '0');
  const blocks = [];
  for (let i = 0; i < str.length; i++) {
    blocks.push(<div key={i} className={\`digit \${color === 'green' ? 'green' : ''}\`}>{str[i]}</div>);
    if ((str.length - 1 - i) % 3 === 0 && i !== str.length - 1) {
      blocks.push(<div key={\`comma-\${i}\`} className="digit-separator">,</div>);
    }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div className="digit-display">{blocks}</div>
      {suffix && <span style={{ fontSize: '14px', color: '#ccc' }}>{suffix}</span>}
    </div>
  );
}

function DeviceSidebarCard({ idx, ds, deviceSetCount, onAddChannel }: { idx: number, ds: DeviceSet, deviceSetCount: number, onAddChannel: () => void }) {
  const { toast } = useToast();
`;

code = code.replace(oldComponent, newCode);

const oldReturn = `  return (
    <div className="device-card" style={{ marginBottom: '4px', borderLeft: isTx ? '3px solid var(--accent-red)' : '3px solid var(--accent-blue)' }}>`;

const newReturn = `  return (
    <div className="native-panel" style={{ marginBottom: '4px' }}>
      <div className="native-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ background: '#d32f2f', color: '#fff', padding: '0 4px', fontSize: '12px', fontWeight: 'bold' }}>T:{idx}</div>
          <button className="run-btn" title="Settings" style={{ fontSize: '14px' }}>⚙</button>
          <button className="run-btn" title="Toggle Run" onClick={handleToggleDeviceState} style={{ background: isRunning ? '#5a7dcf' : '#6e6e6e' }}>
            {isRunning ? '▶' : '▶'}
          </button>
          <span style={{ fontSize: '13px', marginLeft: '4px' }}>{ds.samplingDevice?.displayedName || ds.samplingDevice?.hwType || \`Device \${idx}\`}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button className="run-btn" title="Help" style={{ borderRadius: '50%', fontSize: '11px', width: '18px', height: '18px' }}>?</button>
          <button className="run-btn" title="Close" style={{ fontSize: '12px' }} onClick={handleRemoveDevice}>✕</button>
        </div>
      </div>

      <div className="native-row" style={{ padding: '8px', justifyContent: 'center' }}>
        <MechanicalDisplay value={Math.floor((ds.samplingDevice?.centerFrequency || 435000000) / 1000)} digits={7} color="orange" suffix="kHz" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto' }}>
          <span className="native-label">#0</span>
          <span className="native-label">3000k</span>
        </div>
      </div>

      <div className="native-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '18px', margin: '0 4px' }}>⹓</span>
          <select className="native-select"><option>TX/RX</option></select>
          <button className="run-btn" style={{ fontSize: '11px', width: '20px', height: '20px' }}>X</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="native-label">Clock</span>
          <select className="native-select"><option>internal</option></select>
        </div>
      </div>

      <div className="native-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="native-label" style={{ fontWeight: 'bold' }}>SR</span>
          <MechanicalDisplay value={ds.samplingDevice?.devSampleRate || 3000000} digits={8} color="green" suffix="S/s" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="native-label">Int</span>
          <select className="native-select"><option>1</option></select>
        </div>
      </div>

      <div className="native-row">
        <span className="native-label">Gain</span>
        <div className="native-slider-container">
          <input type="range" className="native-slider" min="0" max="89" defaultValue="50" onMouseUp={e=>handleGainChange(Number(e.target.value))} />
        </div>
        <span className="native-label">50dB</span>
      </div>

      <div className="native-row" style={{ justifyContent: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="native-label">LPF</span>
          <MechanicalDisplay value={10000} digits={5} color="orange" suffix="kHz" />
        </div>
        <div style={{ width: '1px', height: '24px', background: '#222', borderRight: '1px solid #444' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="native-label">LO</span>
          <span style={{ color: '#f39c12', fontSize: '16px', fontWeight: 'bold' }}>+</span>
          <MechanicalDisplay value={0} digits={6} color="orange" suffix="kHz" />
        </div>
      </div>

      <div style={{ padding: '2px' }}>
        {channels.map((ch, cIdx) => (
          <ChannelWorkspaceCard key={cIdx} dsIdx={idx} cIdx={cIdx} channel={ch} />
        ))}
      </div>
    </div>`;

const endOfDeviceCard = `        {channels.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-dark)', borderRadius: '6px', color: '#666', fontSize: '12px', border: '1px dashed #333' }}>
            No channel plugins attached.<br />Click the + button above to add one.
          </div>
        )}
      </div>

    </div>
  );`;

const startIndex = code.indexOf(oldReturn);
const endIndex = code.indexOf(endOfDeviceCard) + endOfDeviceCard.length;

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newReturn + code.substring(endIndex);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched successfully");
} else {
  console.log("Failed to find return block");
}
