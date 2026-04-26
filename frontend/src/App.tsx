import React, { useEffect, useState } from 'react';
import MeshGradientBackground from './components/MeshGradientBackground';
import SupplyChainMap from './components/SupplyChainMap';
import AlertFeed from './components/AlertFeed';
import SystemStatusBar from './components/SystemStatusBar';
import OraclePanel from './components/OraclePanel';
import NavigatorPanel from './components/NavigatorPanel';
import BufferPanel from './components/BufferPanel';
import FortressPanel from './components/FortressPanel';
import LedgerPanel from './components/LedgerPanel';
import { useSupplyChainStore } from './store/supplyChainStore';
import { Brain, Navigation, Archive, Shield, BookOpen, type LucideIcon } from 'lucide-react';

type PanelId = 'oracle' | 'navigator' | 'buffer' | 'fortress' | 'ledger';

interface NavItem {
  id: PanelId;
  label: string;
  icon: LucideIcon;
  activeColor: string;
  dotColor: string;
  glowClass: string;
}

const NAV: NavItem[] = [
  { id: 'oracle',    label: 'ORACLE',    icon: Brain,      activeColor: 'text-cyan-400',    dotColor: 'bg-cyan-400',    glowClass: 'shadow-glow-cyan' },
  { id: 'navigator', label: 'NAVIGATOR', icon: Navigation, activeColor: 'text-violet-400',  dotColor: 'bg-violet-400',  glowClass: '' },
  { id: 'buffer',    label: 'BUFFER',    icon: Archive,    activeColor: 'text-orange-400',  dotColor: 'bg-orange-400',  glowClass: '' },
  { id: 'fortress',  label: 'FORTRESS',  icon: Shield,     activeColor: 'text-red-400',     dotColor: 'bg-red-400',     glowClass: 'shadow-glow-red' },
  { id: 'ledger',    label: 'LEDGER',    icon: BookOpen,   activeColor: 'text-emerald-400', dotColor: 'bg-emerald-400', glowClass: '' },
];

const PANELS: Record<PanelId, React.FC> = {
  oracle:    OraclePanel,
  navigator: NavigatorPanel,
  buffer:    BufferPanel,
  fortress:  FortressPanel,
  ledger:    LedgerPanel,
};

export default function App() {
  const setSystemStatus = useSupplyChainStore(s => s.setSystemStatus);
  const setVessels      = useSupplyChainStore(s => s.setVessels);
  const setThreats      = useSupplyChainStore(s => s.setThreats);
  const [active, setActive] = useState<PanelId>('oracle');

  useEffect(() => {
    // 1. Fetch live threats from backend ORACLE once on mount
    fetch('/api/threats/active')
      .then(r => r.json())
      .then(data => {
        if (data.threats && data.threats.length > 0) {
          // Normalize dates
          const now = new Date().toISOString();
          const threats = data.threats.map((t: any) => ({
            ...t,
            createdAt: t.createdAt || now,
            updatedAt: t.updatedAt || now
          }));
          setThreats(threats);
        }
      })
      .catch(err => console.warn('Failed to fetch live threats:', err));

    // 2. Poll health
    const poll = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const d = await res.json();
          useSupplyChainStore.setState({ threats: d.threats, systemStatus: { apiHealth: 'Online', lastUpdated: new Date().toISOString() } });
        }
      } catch { setSystemStatus({ apiHealth: 'Offline', lastUpdated: new Date().toISOString() }); }
    };
    poll();
    const t = setInterval(poll, 10000);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    // @ts-ignore
    window.__ws = ws; // Expose for supplyChainStore

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'SYNC_ACTION') {
          // Bypass action trigger loop by using setState directly
          if (d.action === 'addRoute') {
            useSupplyChainStore.setState(s => ({ routes: [...s.routes, d.payload] }));
          } else if (d.action === 'updateRoute') {
            useSupplyChainStore.setState(s => ({ routes: s.routes.map(r => r.id === d.payload.id ? { ...r, ...d.payload.patch } : r) }));
          } else if (d.action === 'removeRoute') {
            useSupplyChainStore.setState(s => ({ routes: s.routes.filter(r => r.id !== d.payload) }));
          } else if (d.action === 'addLedgerEntry') {
            useSupplyChainStore.setState(s => ({ ledgerEntries: [d.payload, ...s.ledgerEntries] }));
          }
          return;
        }

        if (d.Message?.PositionReport) {
          const r = d.Message.PositionReport;
          const v = { mmsi: d.MetaData.MMSI.toString(), lat: r.Latitude, lon: r.Longitude, speed: r.Sog, heading: r.TrueHeading, vessel_name: d.MetaData.ShipName || 'Unknown', flag: '' };
          useSupplyChainStore.setState(state => {
            let vl = [...state.vessels];
            const i = vl.findIndex(x => x.mmsi === v.mmsi);
            if (i >= 0) vl[i] = v; else vl.push(v);
            if (vl.length > 300) vl = vl.slice(vl.length - 300); // Prevent memory leak
            return { vessels: vl };
          });
        }
      } catch {}
    };
    return () => { clearInterval(t); ws.close(); };
  }, [setSystemStatus, setVessels]);

  const ActivePanel = PANELS[active];
  const activeItem  = NAV.find(n => n.id === active)!;

  return (
    /* Root layer stack: WebGL → glass UI */
    <div className="relative w-full h-screen overflow-hidden">

      {/* Layer 0: WebGL iridescent mesh gradient */}
      <MeshGradientBackground />

      {/* Layer 1: Glass UI shell */}
      <div className="relative z-10 flex flex-col h-full w-full">

        {/* Top bar */}
        <div className="glass shrink-0 border-b border-white/[0.04]">
          <SystemStatusBar />
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Left: Alert feed */}
          <div className="glass shrink-0 w-[260px] border-r border-white/[0.04] animate-fade-up">
            <AlertFeed />
          </div>

          {/* Center: Map */}
          <div className="flex-1 relative min-w-0 deckgl-wrapper">
            <SupplyChainMap />
          </div>

          {/* Right: Tabs + Panel */}
          <div className="glass shrink-0 w-[380px] border-l border-white/[0.04] flex flex-col animate-slide-in">

            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-white/[0.04]" style={{ background: 'rgba(4,6,15,0.6)' }}>
              {NAV.map(item => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    title={item.label}
                    className={`
                      flex-1 flex flex-col items-center gap-1 py-2.5 px-1 relative
                      transition-all duration-200 border-b-2
                      ${isActive
                        ? `border-b-current ${item.activeColor} bg-white/[0.03]`
                        : 'border-b-transparent text-slate-600 hover:text-slate-400 hover:bg-white/[0.015]'}
                    `}
                  >
                    {/* Active glow dot */}
                    {isActive && (
                      <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${item.dotColor} ring-pulse`} />
                    )}
                    <Icon size={14} />
                    <span className="text-[8px] font-mono tracking-widest">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active panel */}
            <div className="flex-1 overflow-hidden min-h-0">
              <ActivePanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
