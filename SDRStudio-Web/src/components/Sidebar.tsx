import React from 'react';
import { Radio, Cpu, LayoutDashboard, Sliders, Info } from 'lucide-react';

interface SidebarProps {
  active: string;
  onNavigate: (view: string) => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'devices',   icon: Cpu,             label: 'Devices'   },
  { id: 'channels',  icon: Sliders,         label: 'Channels'  },
  { id: 'spectrum',  icon: Radio,           label: 'Spectrum'  },
  { id: 'about',     icon: Info,            label: 'About'     },
];

export const Sidebar: React.FC<SidebarProps> = ({ active, onNavigate }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: hovered ? 160 : 64, minHeight: 0, flex: hovered ? '0 0 160px' : '0 0 64px',
        background: 'rgba(7,11,20,0.95)',
        borderRight: '1px solid rgba(0,212,255,0.08)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '12px 0', gap: 4,
        transition: 'width 250ms ease, flex 250ms ease',
        overflow: 'hidden',
        zIndex: 50,
      }}>
      {navItems.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            title={hovered ? '' : label}
            style={{
              width: hovered ? 136 : 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: hovered ? 'flex-start' : 'center',
              paddingLeft: hovered ? 16 : 0, gap: 12,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              background: isActive ? 'rgba(0,212,255,0.12)' : 'transparent',
              color: isActive ? '#00d4ff' : '#4a5a7a',
              position: 'relative',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLButtonElement).style.color = '#8899bb';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = '#4a5a7a';
              }
            }}
          >
            {isActive && (
              <span style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                width: 3, height: 24, background: '#00d4ff',
                borderRadius: '0 2px 2px 0', boxShadow: '0 0 8px rgba(0,212,255,0.6)',
              }} />
            )}
            <Icon size={18} />
            {hovered && <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>}
          </button>
        );
      })}
    </aside>
  );
};
