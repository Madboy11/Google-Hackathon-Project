import { useEffect, useState, useCallback } from 'react';
import { GlobalMap } from './components/GlobalMap';
import { InventoryDashboard } from './components/InventoryDashboard';
import { DemoControls } from './components/DemoControls';
import { SystemDiagnostics } from './components/SystemDiagnostics';
import { getCurrentRouting, getRiskScore, getSafetyStock, getHealth } from './api/nexusApi';
import './index.css';

// ─── Types ───
interface RouteData {
  origin: [number, number];
  destination: [number, number];
  risk_score?: number;
  route_id?: string;
  originLabel?: string;
  destLabel?: string;
}

interface RiskNode {
  longitude: number;
  latitude: number;
  risk_score: number;
  id: string;
  label?: string;
}

interface StockItem {
  sku_id: string;
  current_stock: number;
  recommended_stock: number;
  po_info?: { po_triggered: boolean; po_quantity: number };
}

interface LogEntry {
  ts: string;
  id: string;
  msg: string;
  severity: 'nominal' | 'warning' | 'critical';
}

// ─── Constants ───
const DEFAULT_ROUTES: RouteData[] = [
  { origin: [32.3, 30.0], destination: [43.1, 12.5], risk_score: 0.1, route_id: 'suez-bab', originLabel: 'Port Said', destLabel: 'Bab el-Mandeb' },
  { origin: [43.1, 12.5], destination: [103.8, 1.35], risk_score: 0.1, route_id: 'bab-sgp', originLabel: 'Bab el-Mandeb', destLabel: 'Singapore' },
];

const REROUTED_ROUTES: RouteData[] = [
  { origin: [32.3, 30.0], destination: [39.5, -6.1], risk_score: 0.3, route_id: 'suez-dar', originLabel: 'Port Said', destLabel: 'Dar es Salaam' },
  { origin: [39.5, -6.1], destination: [18.4, -33.9], risk_score: 0.2, route_id: 'dar-cape', originLabel: 'Dar es Salaam', destLabel: 'Cape Town' },
  { origin: [18.4, -33.9], destination: [103.8, 1.35], risk_score: 0.1, route_id: 'cape-sgp', originLabel: 'Cape Town', destLabel: 'Singapore' },
];

// Nodes that only appear during reroute
const REROUTE_EXTRA_NODES: RiskNode[] = [
  { longitude: 39.5, latitude: -6.1, risk_score: 0.25, id: 'dar-es-salaam', label: 'Dar es Salaam' },
  { longitude: 18.4, latitude: -33.9, risk_score: 0.15, id: 'cape-town', label: 'Cape Town' },
];

const DEFAULT_RISK_NODES: RiskNode[] = [
  { longitude: 32.3, latitude: 30.0, risk_score: 0.15, id: 'port-said', label: 'Port Said' },
  { longitude: 43.1, latitude: 12.5, risk_score: 0.20, id: 'RED_SEA_CORRIDOR', label: 'Bab el-Mandeb' },
  { longitude: 103.8, latitude: 1.35, risk_score: 0.05, id: 'singapore', label: 'Singapore' },
  { longitude: -74.0, latitude: 40.7, risk_score: 0.08, id: 'nyc', label: 'New York' },
  { longitude: 3.7, latitude: 51.2, risk_score: 0.12, id: 'rotterdam', label: 'Rotterdam' },
];

const DEMAND_DATA = [
  { node: 'Rotterdam', demand_variance: 420 },
  { node: 'Singapore', demand_variance: 310 },
  { node: 'Port Said', demand_variance: 580 },
  { node: 'New York', demand_variance: 240 },
];

// ─── Helpers ───
const ts = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const shortId = () => Math.random().toString(36).substring(2, 8);

// ─── App ───
export default function App() {
  const [routes, setRoutes] = useState<RouteData[]>(DEFAULT_ROUTES);
  const [riskNodes, setRiskNodes] = useState<RiskNode[]>(DEFAULT_RISK_NODES);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [backendLive, setBackendLive] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    { ts: ts(), id: shortId(), msg: 'SYSTEM INITIALIZED — ALL MODULES NOMINAL', severity: 'nominal' },
  ]);

  const addLog = useCallback((msg: string, severity: LogEntry['severity'] = 'nominal') => {
    setLogs((prev) => [{ ts: ts(), id: shortId(), msg, severity }, ...prev].slice(0, 50));
  }, []);

  // ─── Initial Data Fetch ───
  useEffect(() => {
    const init = async () => {
      // Check backend
      const health = await getHealth();
      const live = health.status === 'OK';
      setBackendLive(live);
      addLog(live ? 'BACKEND CONNECTED — localhost:8000' : 'BACKEND OFFLINE — MOCK MODE ACTIVE', live ? 'nominal' : 'warning');

      // Risk assessment
      const riskResult = await getRiskScore('RED_SEA_CORRIDOR');
      setRiskNodes((prev) =>
        prev.map((n) =>
          n.id === 'RED_SEA_CORRIDOR' ? { ...n, risk_score: riskResult.risk_score ?? 0.2 } : n
        )
      );

      // Routing
      const routingResult = await getCurrentRouting();
      if (Array.isArray(routingResult) && routingResult.length > 0 && routingResult[0].vessel_id) {
        addLog(`NAVIGATOR: ${routingResult.length} active vessels tracked`);
      }

      // Inventory
      const skus = ['SKU-ABC', 'SKU-XYZ'];
      const stockResults = await Promise.all(skus.map((s) => getSafetyStock(s)));
      setInventory(stockResults);
      addLog(`BUFFER: ${stockResults.length} SKUs loaded`);
    };
    init();
  }, [addLog]);

  // ─── Demo Trigger Handler ───
  const handleDemoTrigger = useCallback(() => {
    // Step 1 (0ms): ORACLE — Risk escalation on Red Sea node
    setRiskNodes((prev) =>
      prev.map((n) => (n.id === 'RED_SEA_CORRIDOR' ? { ...n, risk_score: 0.95 } : n))
    );
    addLog('ORACLE: Red Sea corridor risk → 0.95 (CRITICAL)', 'critical');

    // Step 2 (800ms): Clear old routes — visual pause before reroute
    setTimeout(() => {
      setRoutes([]);
      addLog('NAVIGATOR: Suez route BLOCKED — computing alternatives...', 'warning');
    }, 800);

    // Step 3 (1500ms): Add waypoint nodes (Dar es Salaam + Cape Town appear on map)
    setTimeout(() => {
      setRiskNodes((prev) => {
        const ids = prev.map((n) => n.id);
        const extras = REROUTE_EXTRA_NODES.filter((n) => !ids.includes(n.id));
        return [...prev, ...extras];
      });
      addLog('NAVIGATOR: Waypoints identified — Dar es Salaam, Cape Town', 'warning');
    }, 1500);

    // Step 4 (2200ms): Draw new rerouted arcs — arcs animate in via transitions
    setTimeout(() => {
      setRoutes(REROUTED_ROUTES);
      addLog('NAVIGATOR: Rerouting via Cape of Good Hope', 'warning');
      addLog('NAVIGATOR: +$12,400 cost delta / +36h delay delta', 'warning');
    }, 2200);

    // Step 5 (3200ms): BUFFER — Inventory recalculation + PO trigger
    setTimeout(() => {
      setInventory((prev) =>
        prev.map((s) => ({
          ...s,
          recommended_stock: Math.round(s.recommended_stock * 1.3),
          po_info: { ...s.po_info!, po_triggered: true, po_quantity: 50 },
        }))
      );
      addLog('BUFFER: Safety stock recalculated — PO triggered', 'warning');
      addLog('FORTRESS: Anomaly logged — geopolitical_closure', 'warning');
      addLog('LEDGER: Event committed to Hyperledger Fabric', 'nominal');
    }, 3200);
  }, [addLog]);

  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text font-inter">
      {/* ─── Header ─── */}
      <header className="border-b border-nexus-border">
        <div className="max-w-[1800px] mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 border border-nexus-border-active flex items-center justify-center">
              <div className="w-2 h-2 bg-white"></div>
            </div>
            <div>
              <h1 className="text-sm font-grotesk font-bold tracking-[0.15em] text-nexus-accent">
                NEXUS-SC
              </h1>
              <p className="text-[9px] font-grotesk tracking-[0.25em] text-nexus-muted mt-0.5">
                GLOBAL RISK COMMAND CENTER
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 inline-block ${backendLive ? 'bg-white' : 'bg-nexus-subtle'}`}></span>
              <span className="text-[10px] font-grotesk tracking-[0.15em] text-nexus-muted">
                {backendLive === null ? 'CONNECTING' : backendLive ? 'LIVE' : 'MOCK'}
              </span>
            </div>
            <div className="text-[10px] font-grotesk tracking-[0.15em] text-nexus-muted tabular-nums">
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Grid ─── */}
      <main className="max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-px bg-nexus-border">
          {/* Left Column */}
          <div className="bg-nexus-bg flex flex-col gap-px">
            {/* Map Section */}
            <div className="nexus-panel relative">
              <div className="absolute top-4 left-5 z-20">
                <div className="nexus-label">THREAT INTELLIGENCE — LIVE</div>
              </div>
              <GlobalMap routes={routes} riskNodes={riskNodes} />
            </div>

            {/* Inventory Section */}
            <InventoryDashboard stockData={inventory} demandData={DEMAND_DATA} />
          </div>

          {/* Right Column */}
          <div className="bg-nexus-bg flex flex-col gap-px">
            <SystemDiagnostics />
            <DemoControls onTriggerEvent={handleDemoTrigger} />

            {/* Event Log */}
            <div className="nexus-panel p-5 flex-1 flex flex-col min-h-0">
              <div className="nexus-label mb-3">EVENT LOG</div>
              <div className="flex-1 overflow-y-auto space-y-0 min-h-0 max-h-[400px]">
                {logs.map((log, i) => (
                  <div
                    key={`${log.id}-${i}`}
                    className="py-2 border-b border-nexus-border last:border-0 flex gap-3 items-start"
                  >
                    <span className="text-[9px] font-grotesk text-nexus-subtle tabular-nums whitespace-nowrap mt-0.5">
                      {log.ts}
                    </span>
                    <span
                      className={`text-[11px] font-grotesk leading-relaxed ${
                        log.severity === 'critical'
                          ? 'text-white font-semibold'
                          : log.severity === 'warning'
                          ? 'text-nexus-text'
                          : 'text-nexus-text-secondary'
                      }`}
                    >
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
