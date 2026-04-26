// @ts-nocheck
import React, { useState } from 'react';
import { Navigation, Plus, Trash2, RefreshCw, Loader2, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useSupplyChainStore, ActiveRoute, RouteStatus } from '../store/supplyChainStore';
import { generateMaritimeRoute, estimateVoyageDays, hasAlternateRoute } from '../utils/maritimeRouter';

// ── Port coordinates lookup ────────────────────────────────────────────────
const PORT_COORDS: Record<string, [number, number]> = {
  'Port of Shanghai':      [121.47, 31.23],
  'Port of Rotterdam':     [4.40,   51.90],
  'Port of Singapore':     [103.82,  1.26],
  'Port of Dubai (Jebel Ali)': [55.03, 24.98],
  'Port of Los Angeles':   [-118.27, 33.73],
  'Port of Hamburg':       [9.97,   53.54],
  'Port of Busan':         [129.04, 35.10],
  'Port of Hong Kong':     [114.17, 22.30],
  'Port of Antwerp':       [4.40,   51.23],
  'Port of New York':      [-74.00, 40.66],
  'Port of Mumbai':        [72.85,  18.93],
  'Port of Colombo':       [79.87,   6.94],
};
const PORTS = Object.keys(PORT_COORDS);
const CARGO_TYPES = ['Electronics', 'Petroleum', 'Containers', 'Bulk Grain', 'Chemicals', 'Vehicles', 'Pharmaceuticals'];

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_CFG: Record<RouteStatus, { color: string; bg: string; border: string; label: string }> = {
  active:    { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'ACTIVE' },
  rerouting: { color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  label: 'REROUTING' },
  at_risk:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: 'AT RISK' },
  completed: { color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   label: 'DONE' },
  cancelled: { color: 'text-slate-500',   bg: 'bg-slate-500/5',    border: 'border-slate-600/20',   label: 'CANCELLED' },
};

function RiskBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value > 0.7 ? 'bg-red-500' : value > 0.4 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-500 w-6 text-right">{pct}%</span>
    </div>
  );
}

// ── Add Route Form ────────────────────────────────────────────────────────
function AddRouteModal({ onClose }: { onClose: () => void }) {
  const addRoute = useSupplyChainStore(s => s.addRoute);
  const addLedgerEntry = useSupplyChainStore(s => s.addLedgerEntry);
  const [origin, setOrigin] = useState(PORTS[0]);
  const [dest, setDest] = useState(PORTS[1]);
  const [cargo, setCargo] = useState(CARGO_TYPES[0]);
  const [carrier, setCarrier] = useState('');
  const [departure, setDeparture] = useState(() => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (origin === dest) { setError('Origin and destination must differ.'); return; }
    setError('');
    setLoading(true);
    try {
      // Generate realistic maritime waypoints via sea-lane graph
      const seaWaypoints = generateMaritimeRoute(origin, dest);
      const fallbackWaypoints = [PORT_COORDS[origin] ?? [0, 0], PORT_COORDS[dest] ?? [0, 0]];
      const waypoints = seaWaypoints.length >= 2 ? seaWaypoints : fallbackWaypoints;
      const estDays = seaWaypoints.length >= 2 ? estimateVoyageDays(seaWaypoints) : 20;

      // Try MCP for risk score enrichment
      let riskScore = 0.3;
      let costUSD = 45000 + estDays * 2800;
      try {
        const res = await fetch('http://127.0.0.1:8003/tools/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'optimise_route', args: { origin_port: origin, destination_port: dest, cargo_type: cargo.toLowerCase(), departure_date: departure } }),
        });
        const data = await res.json();
        riskScore = data.risk_adjusted_score ?? riskScore;
        costUSD = data.cost_usd ?? costUSD;
      } catch { /* MCP offline — use defaults */ }

      const route: ActiveRoute = {
        id: `rt-${Date.now()}`,
        origin,
        destination: dest,
        originCoords: PORT_COORDS[origin] ?? [0, 0],
        destCoords: PORT_COORDS[dest] ?? [0, 0],
        cargo,
        carrier: carrier || 'NEXUS Auto',
        departureDate: departure,
        waypoints,
        riskScore,
        estimatedDays: estDays,
        costUSD,
        status: riskScore > 0.7 ? 'at_risk' : 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        autoRerouted: false,
        reroutableBy: 'oracle',
      };

      addRoute(route);
      addLedgerEntry({
        type: 'ROUTE_CREATED',
        summary: `Route created: ${origin.replace('Port of ', '')} → ${dest.replace('Port of ', '')} (${waypoints.length} waypoints, ${estDays}d)`,
        payload: { routeId: route.id, origin, destination: dest, cargo, riskScore, waypointCount: waypoints.length },
        initiatedBy: 'navigator',
        timestamp: new Date().toISOString(),
      });
      onClose();
    } catch (e: any) {
      setError('Failed to create route: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const sel = "w-full bg-slate-900/70 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-violet-500/40 font-mono transition-all appearance-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-[400px] rounded-xl border border-slate-700/60 flex flex-col" style={{ background: '#0d1220' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/60">
          <Navigation size={16} className="text-violet-400" />
          <span className="text-sm font-bold text-slate-200">Add New Route</span>
          <button onClick={onClose} className="ml-auto text-slate-600 hover:text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 font-mono uppercase block mb-1">Origin Port</label>
              <select value={origin} onChange={e => setOrigin(e.target.value)} className={sel}>
                {PORTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-600 font-mono uppercase block mb-1">Destination Port</label>
              <select value={dest} onChange={e => setDest(e.target.value)} className={sel}>
                {PORTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 font-mono uppercase block mb-1">Cargo Type</label>
              <select value={cargo} onChange={e => setCargo(e.target.value)} className={sel}>
                {CARGO_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-600 font-mono uppercase block mb-1">Carrier</label>
              <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. MSC, Maersk" className={sel} />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-600 font-mono uppercase block mb-1">Departure Date</label>
            <input type="date" value={departure} onChange={e => setDeparture(e.target.value)} className={sel + ' [color-scheme:dark]'} />
          </div>
          {error && <p className="text-[11px] text-red-400 font-mono">{error}</p>}
          <button onClick={handleAdd} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 text-sm font-mono hover:bg-violet-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" />Optimising via OSRM...</> : <><Navigation size={14} />Optimise & Add Route</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Navigator Panel ──────────────────────────────────────────────────
export default function NavigatorPanel() {
  const routes = useSupplyChainStore(s => s.routes);
  const updateRoute = useSupplyChainStore(s => s.updateRoute);
  const removeRoute = useSupplyChainStore(s => s.removeRoute);
  const addLedgerEntry = useSupplyChainStore(s => s.addLedgerEntry);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reroutingId, setReroutingId] = useState<string | null>(null);

  const selectedRoute = routes.find(r => r.id === selected);

  const handleReroute = async (route: ActiveRoute) => {
    setReroutingId(route.id);
    updateRoute(route.id, { status: 'rerouting' });
    try {
      // Use ALTERNATE route to visibly change path (e.g. Suez → Cape of Good Hope)
      const useAlt = !route.autoRerouted && hasAlternateRoute(route.origin, route.destination);
      const newWaypoints = generateMaritimeRoute(route.origin, route.destination, useAlt);
      const waypoints = newWaypoints.length >= 2 ? newWaypoints : route.waypoints;
      const estDays = newWaypoints.length >= 2 ? estimateVoyageDays(newWaypoints) : route.estimatedDays;

      // Rerouting reduces risk since it avoids the danger zone
      const newRisk = Math.max(0.08, route.riskScore * (useAlt ? 0.45 : 0.75));
      const newCost = Math.round(route.costUSD * (useAlt ? 1.35 : 1.1)); // alternate is longer = costlier

      updateRoute(route.id, {
        waypoints,
        riskScore: newRisk,
        estimatedDays: estDays,
        costUSD: newCost,
        status: newRisk > 0.7 ? 'at_risk' : 'active',
        autoRerouted: true,
        previousRiskScore: route.riskScore,
      });
      addLedgerEntry({
        type: 'ROUTE_REROUTED',
        summary: `Route rerouted via ${useAlt ? 'alternate corridor' : 'optimised path'}: ${route.origin.replace('Port of ', '')} → ${route.destination.replace('Port of ', '')} (risk ${Math.round(route.riskScore * 100)}% → ${Math.round(newRisk * 100)}%)`,
        payload: { routeId: route.id, oldRisk: route.riskScore, newRisk, waypointCount: waypoints.length, alternate: useAlt },
        initiatedBy: 'oracle',
        timestamp: new Date().toISOString(),
      });
    } catch {
      updateRoute(route.id, { status: route.riskScore > 0.7 ? 'at_risk' : 'active' });
    } finally {
      setReroutingId(null);
    }
  };

  const handleDelete = (id: string) => {
    const r = routes.find(x => x.id === id);
    removeRoute(id);
    if (r) addLedgerEntry({ type: 'ROUTE_CANCELLED', summary: `Route cancelled: ${r.origin.replace('Port of ', '')} → ${r.destination.replace('Port of ', '')}`, payload: { routeId: id }, initiatedBy: 'navigator', timestamp: new Date().toISOString() });
    if (selected === id) setSelected(null);
  };

  const activeCount = routes.filter(r => r.status === 'active' || r.status === 'at_risk' || r.status === 'rerouting').length;
  const atRiskCount = routes.filter(r => r.status === 'at_risk').length;

  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg,#0A0F1E 0%,#080C18 100%)' }}>
      {showModal && <AddRouteModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-violet-500/10 flex items-center gap-3" style={{ background: 'rgba(139,92,246,0.03)' }}>
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Navigation size={16} className="text-violet-400" />
          </div>
          {atRiskCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[#0A0F1E] flex items-center justify-center text-[8px] font-bold text-white animate-pulse">{atRiskCount}</div>}
        </div>
        <div>
          <div className="text-xs font-bold tracking-[0.15em] text-violet-400 uppercase">NAVIGATOR</div>
          <div className="text-[10px] text-slate-500 font-mono">{activeCount} active route{activeCount !== 1 ? 's' : ''} on map</div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-mono hover:bg-violet-500/20 transition-all">
          <Plus size={12} /> Add Route
        </button>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-3 gap-px bg-slate-800/30 border-b border-slate-800/40">
        {[
          { label: 'Total Routes', value: routes.length, color: 'text-slate-300' },
          { label: 'At Risk', value: atRiskCount, color: 'text-red-400' },
          { label: 'Avg Risk', value: routes.length ? `${Math.round(routes.reduce((s, r) => s + r.riskScore, 0) / routes.length * 100)}%` : '—', color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900/20 px-3 py-2">
            <div className="text-[9px] text-slate-600 font-mono uppercase">{label}</div>
            <div className={`text-sm font-bold font-mono ${color} mt-0.5`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Route list */}
        <div className={`overflow-y-auto border-r border-slate-800/30 ${selectedRoute ? 'w-1/2' : 'w-full'}`}>
          {routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <Navigation size={28} className="text-violet-400/20" />
              <p className="text-slate-600 text-xs font-mono">No routes added yet.<br />Click "Add Route" to optimise a new shipping lane.</p>
            </div>
          ) : (
            routes.map(route => {
              const cfg = STATUS_CFG[route.status];
              const isSelected = selected === route.id;
              return (
                <button key={route.id} onClick={() => setSelected(isSelected ? null : route.id)}
                  className={`w-full text-left px-3 py-3 border-b border-slate-800/20 transition-colors ${isSelected ? 'bg-violet-500/5 border-l-2 border-l-violet-500/40' : 'hover:bg-slate-900/20'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-medium text-slate-300 truncate flex-1">
                      {route.origin.replace('Port of ', '')} → {route.destination.replace('Port of ', '')}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${cfg.color} ${cfg.bg} ${cfg.border}`}>{cfg.label}</span>
                  </div>
                  <RiskBar value={route.riskScore} />
                  <div className="flex gap-3 mt-1.5 text-[10px] font-mono text-slate-600">
                    <span>{route.cargo}</span>
                    <span>{route.estimatedDays}d</span>
                    <span>${(route.costUSD / 1000).toFixed(0)}k</span>
                    {route.autoRerouted && <span className="text-yellow-500">↺ rerouted</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail pane */}
        {selectedRoute && (
          <div className="w-1/2 overflow-y-auto p-3 flex flex-col gap-3">
            <div>
              <div className="text-[10px] text-slate-500 font-mono mb-0.5 uppercase tracking-wider">Route Detail</div>
              <div className="text-xs font-semibold text-slate-200">
                {selectedRoute.origin.replace('Port of ', '')}
                <span className="text-slate-600 mx-1">→</span>
                {selectedRoute.destination.replace('Port of ', '')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              {[
                ['Cargo', selectedRoute.cargo],
                ['Carrier', selectedRoute.carrier],
                ['Departure', new Date(selectedRoute.departureDate).toLocaleDateString()],
                ['ETA', `${selectedRoute.estimatedDays} days`],
                ['Cost', `$${selectedRoute.costUSD.toLocaleString()}`],
                ['Waypoints', `${selectedRoute.waypoints.length}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded bg-slate-900/40 border border-slate-800/40 px-2 py-1.5">
                  <div className="text-slate-600 text-[9px] uppercase">{k}</div>
                  <div className="text-slate-300 truncate">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[9px] text-slate-600 font-mono uppercase mb-1">Risk Score</div>
              <RiskBar value={selectedRoute.riskScore} />
              {selectedRoute.previousRiskScore != null && (
                <div className="text-[10px] font-mono text-yellow-500 mt-1">
                  Was {Math.round(selectedRoute.previousRiskScore * 100)}% → now {Math.round(selectedRoute.riskScore * 100)}%
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button onClick={() => handleReroute(selectedRoute)} disabled={reroutingId === selectedRoute.id}
                className="w-full py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-mono hover:bg-yellow-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                {reroutingId === selectedRoute.id ? <><Loader2 size={12} className="animate-spin" />Rerouting...</> : <><RefreshCw size={12} />Oracle Reroute</>}
              </button>
              <button onClick={() => handleDelete(selectedRoute.id)}
                className="w-full py-2 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 text-xs font-mono hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
                <Trash2 size={12} />Cancel Route
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
