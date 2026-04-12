
const DVB_STANDARDS = [
  { label: 'DVB-S', value: 0 },
  { label: 'DVB-S2', value: 1 },
];

const MODULATIONS = [
  { label: 'BPSK', value: 0 },
  { label: 'QPSK', value: 1 },
  { label: '8PSK', value: 2 },
  { label: '16APSK', value: 3 },
  { label: '32APSK', value: 4 }
];

const FEC_OPTIONS = [
  { label: '1/2', value: 0 },
  { label: '2/3', value: 1 },
  { label: '3/4', value: 2 },
  { label: '5/6', value: 3 },
  { label: '7/8', value: 4 },
  { label: '4/5', value: 5 },
  { label: '8/9', value: 6 },
  { label: '9/10', value: 7 },
  { label: '1/4', value: 8 },
  { label: '1/3', value: 9 },
  { label: '2/5', value: 10 },
  { label: '3/5', value: 11 }
];

const ROLLOFF = [
  { label: '0.35', value: 0.35 },
  { label: '0.25', value: 0.25 },
  { label: '0.20', value: 0.20 }
];

const SOURCES = [
  { label: 'Image', value: 0 },
  { label: 'File', value: 1 },
  { label: 'UDP', value: 2 }
];

const CODECS = [
  { label: 'HEVC', value: 0 },
  { label: 'H264', value: 1 }
];

interface Props {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export function DatvModSettingsEditor({ settings, onChange }: Props) {
  // Helper to safely call onChange with number/string types
  const handleChange = (key: string, typedVal: any) => {
    onChange(key, typedVal);
  };

  return (
    <div className="datvmod-settings">
      <style>{`
        .datvmod-settings {
          background: #111;
          border-top: 1px solid var(--border-color);
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 11px;
        }
        .datv-panel {
          border: 1px solid #333;
          border-radius: 4px;
          background: #1a1a1c;
          padding: 8px;
        }
        .datv-header {
          font-weight: 600;
          color: #ff8c00;
          margin-bottom: 8px;
          border-bottom: 1px solid #333;
          padding-bottom: 4px;
          font-size: 12px;
        }
        .datv-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-end;
          margin-bottom: 8px;
        }
        .datv-row:last-child {
          margin-bottom: 0;
        }
        .datv-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .datv-field label {
          color: #aaa;
          font-size: 9px;
          text-transform: uppercase;
        }
        .datvmod-settings input, .datvmod-settings select {
          background: #000;
          border: 1px solid #444;
          color: #eee;
          padding: 4px;
          border-radius: 2px;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
        }
        .datvmod-settings input:focus, .datvmod-settings select:focus {
          border-color: #0078d7;
          outline: none;
        }
        .datvmod-settings input[type=checkbox] {
          width: 14px;
          height: 14px;
          margin-bottom: 4px;
        }
        .datvmod-settings button {
          background: #333;
          border: 1px solid #555;
          color: #fff;
          padding: 3px 12px;
          border-radius: 2px;
          cursor: pointer;
          height: 24px;
          font-size: 11px;
          transition: background 0.1s;
        }
        .datvmod-settings button:hover {
          background: #444;
        }
        .datvmod-settings button:active {
          background: #222;
        }
        .datvmod-settings .info-text {
          font-size: 9px;
          color: #888;
          margin-top: 2px;
        }
      `}</style>

      {/* 1. Base Settings */}
      <div className="datv-row" style={{ borderBottom: '1px solid #333', paddingBottom: '8px' }}>
        <div className="datv-field">
          <label>Delta Freq (Hz)</label>
          <input type="number" 
                 value={settings.inputFrequencyOffset ?? 0}
                 onChange={e => handleChange('inputFrequencyOffset', Number(e.target.value))} />
        </div>
        
        <div className="datv-field">
          <label>Channel Mute</label>
          <input type="checkbox" 
                 checked={settings.channelMute === 1}
                 onChange={e => handleChange('channelMute', e.target.checked ? 1 : 0)} />
        </div>
      </div>

      {/* 2. DVB Coding Settings */}
      <div className="datv-panel">
        <div className="datv-header">Transmission Standard & RF</div>
        <div className="datv-row">
          <div className="datv-field">
            <label>Standard</label>
            <select value={settings.standard ?? 0} onChange={e => handleChange('standard', Number(e.target.value))}>
              {DVB_STANDARDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          
          <div className="datv-field" style={{ flex: 1 }}>
            <label>Symbol Rate (Sym/s)</label>
            <input type="number" step="100" min="1" 
                   value={settings.symbolRate ?? 250000}
                   onChange={e => handleChange('symbolRate', Number(e.target.value))} />
          </div>

          <div className="datv-field">
            <label>RF Bandwidth</label>
            <input style={{width: 80}} type="number" step="1"
                   value={settings.rfBandwidth ?? 1.0}
                   onChange={e => handleChange('rfBandwidth', Number(e.target.value))} />
          </div>
        </div>

        <div className="datv-row">
          <div className="datv-field">
            <label>FEC</label>
            <select value={settings.fec ?? 0} onChange={e => handleChange('fec', Number(e.target.value))}>
              {FEC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="datv-field">
            <label>Modulation</label>
            <select value={settings.modulation ?? 1} onChange={e => handleChange('modulation', Number(e.target.value))}>
              {MODULATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="datv-field">
            <label>Roll Off</label>
            <select value={settings.rollOff ?? 0.35} onChange={e => handleChange('rollOff', Number(e.target.value))}>
              {ROLLOFF.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Transport Stream Source */}
      <div className="datv-panel">
        <div className="datv-header">Transport Stream Source</div>
        <div className="datv-row">
          <div className="datv-field">
            <label>Source Type</label>
            <select value={settings.tsSource ?? 0} onChange={e => handleChange('tsSource', Number(e.target.value))}>
              {SOURCES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {settings.tsSource === 0 && ( /* Image */
          <div className="datv-row" style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #333' }}>
             <div className="datv-field" style={{flex: 1}}>
                 <label>Image File Path</label>
                 <input type="text" value={settings.imageFileName ?? ''} onChange={e => handleChange('imageFileName', e.target.value)} />
             </div>
             <div className="datv-field">
                 <label>Codec</label>
                 <select value={settings.imageCodec ?? 0} onChange={e => handleChange('imageCodec', Number(e.target.value))}>
                    {CODECS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                 </select>
             </div>
             <div className="datv-field">
                 <label>Time</label>
                 <input type="checkbox" checked={settings.imageOverlayTimestamp === 1} onChange={e => handleChange('imageOverlayTimestamp', e.target.checked ? 1 : 0)} />
             </div>
             <div className="datv-field">
                 <label>Provider</label>
                 <input style={{width: 70}} type="text" value={settings.imageServiceProvider ?? ''} onChange={e => handleChange('imageServiceProvider', e.target.value)} />
             </div>
             <div className="datv-field">
                 <label>Service</label>
                 <input style={{width: 70}} type="text" value={settings.imageServiceName ?? ''} onChange={e => handleChange('imageServiceName', e.target.value)} />
             </div>
          </div>
        )}

        {settings.tsSource === 1 && ( /* File */
          <div className="datv-row" style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #333' }}>
             <div className="datv-field" style={{flex: 1}}>
                 <label>TS File Name (.ts)</label>
                 <input type="text" value={settings.tsFileName ?? ''} onChange={e => handleChange('tsFileName', e.target.value)} disabled style={{ opacity: 0.7 }} />
                 <span className="info-text">Upload via the ⬆️ icon above this panel</span>
             </div>
             <div className="datv-field">
                 <label>Loop</label>
                 <input type="checkbox" checked={settings.tsFilePlayLoop === 1} onChange={e => handleChange('tsFilePlayLoop', e.target.checked ? 1 : 0)} />
             </div>
             <div className="datv-field">
                 <label>Actions</label>
                 <button onClick={() => handleChange('tsFilePlay', settings.tsFilePlay === 1 ? 0 : 1)}>
                   {settings.tsFilePlay === 1 ? '⏸ Pause' : '▶ Play'}
                 </button>
             </div>
          </div>
        )}

        {settings.tsSource === 2 && ( /* UDP */
          <div className="datv-row" style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #333' }}>
             <div className="datv-field" style={{flex: 1}}>
                 <label>UDP Address</label>
                 <input type="text" value={settings.udpAddress ?? '127.0.0.1'} onChange={e => handleChange('udpAddress', e.target.value)} />
             </div>
             <div className="datv-field">
                 <label>UDP Port</label>
                 <input type="number" value={settings.udpPort ?? 5004} onChange={e => handleChange('udpPort', Number(e.target.value))} />
                 <span className="info-text">FFMPEG destination port</span>
             </div>
          </div>
        )}
      </div>

    </div>
  );
}
