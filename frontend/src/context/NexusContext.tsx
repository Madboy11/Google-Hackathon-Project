import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { RouteData, RiskNode, StockItem, LogEntry } from '../types';
import { getCurrentRouting, getRiskScore, getSafetyStock, getHealth } from '../api/nexusApi';

// ─── Constants ───
const DEFAULT_ROUTES: RouteData[] = [
  { origin: [32.3, 30.0], destination: [43.1, 12.5], risk_score: 0.1, route_id: 'suez-bab', originLabel: 'Port Said', destLabel: 'Bab el-Mandeb', progress: 0.1 },
  { origin: [43.1, 12.5], destination: [103.8, 1.35], risk_score: 0.1, route_id: 'bab-sgp', originLabel: 'Bab el-Mandeb', destLabel: 'Singapore', progress: 0.4 },
  { origin: [-118.2, 34.0], destination: [139.7, 35.6], risk_score: 0.05, route_id: 'la-tokyo', originLabel: 'Los Angeles', destLabel: 'Tokyo', progress: 0.2 },
  { origin: [139.7, 35.6], destination: [151.2, -33.8], risk_score: 0.02, route_id: 'tokyo-sydney', originLabel: 'Tokyo', destLabel: 'Sydney', progress: 0.8 },
  { origin: [-74.0, 40.7], destination: [3.7, 51.2], risk_score: 0.08, route_id: 'nyc-rotterdam', originLabel: 'New York', destLabel: 'Rotterdam', progress: 0.6 },
  { origin: [103.8, 1.35], destination: [151.2, -33.8], risk_score: 0.1, route_id: 'sgp-sydney', originLabel: 'Singapore', destLabel: 'Sydney', progress: 0.3 }
];

const REROUTED_ROUTES: RouteData[] = [
  { origin: [32.3, 30.0], destination: [39.5, -6.1], risk_score: 0.3, route_id: 'suez-dar', originLabel: 'Port Said', destLabel: 'Dar es Salaam', progress: 0.0 },
  { origin: [39.5, -6.1], destination: [18.4, -33.9], risk_score: 0.2, route_id: 'dar-cape', originLabel: 'Dar es Salaam', destLabel: 'Cape Town', progress: 0.2 },
  { origin: [18.4, -33.9], destination: [103.8, 1.35], risk_score: 0.1, route_id: 'cape-sgp', originLabel: 'Cape Town', destLabel: 'Singapore', progress: 0.5 },
  // Keep the other unaffected routes active during the crisis simulation
  { origin: [-118.2, 34.0], destination: [139.7, 35.6], risk_score: 0.05, route_id: 'la-tokyo', originLabel: 'Los Angeles', destLabel: 'Tokyo', progress: 0.2 },
  { origin: [139.7, 35.6], destination: [151.2, -33.8], risk_score: 0.02, route_id: 'tokyo-sydney', originLabel: 'Tokyo', destLabel: 'Sydney', progress: 0.8 },
  { origin: [-74.0, 40.7], destination: [3.7, 51.2], risk_score: 0.08, route_id: 'nyc-rotterdam', originLabel: 'New York', destLabel: 'Rotterdam', progress: 0.6 },
  { origin: [103.8, 1.35], destination: [151.2, -33.8], risk_score: 0.1, route_id: 'sgp-sydney', originLabel: 'Singapore', destLabel: 'Sydney', progress: 0.3 }
];

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
  { longitude: -118.2, latitude: 34.0, risk_score: 0.06, id: 'los-angeles', label: 'Los Angeles' },
  { longitude: 139.7, latitude: 35.6, risk_score: 0.04, id: 'tokyo', label: 'Tokyo' },
  { longitude: 151.2, latitude: -33.8, risk_score: 0.03, id: 'sydney', label: 'Sydney' }
];

export const DEMAND_DATA = [
  { node: 'Rotterdam', demand_variance: 420 },
  { node: 'Singapore', demand_variance: 310 },
  { node: 'Port Said', demand_variance: 580 },
  { node: 'New York', demand_variance: 240 },
  { node: 'Los Angeles', demand_variance: 450 },
  { node: 'Tokyo', demand_variance: 620 },
];

const ts = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const shortId = () => Math.random().toString(36).substring(2, 8);

export type SimulationPhase = 'nominal' | 'crisis' | 'ai_rerouting' | 'system_review';

interface NexusContextProps {
  routes: RouteData[];
  riskNodes: RiskNode[];
  inventory: StockItem[];
  logs: LogEntry[];
  backendLive: boolean | null;
  simulationPhase: SimulationPhase;
  addLog: (msg: string, severity?: LogEntry['severity']) => void;
}

const NexusContext = createContext<NexusContextProps | undefined>(undefined);

export const NexusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [routes, setRoutes] = useState<RouteData[]>(DEFAULT_ROUTES);
  const [riskNodes, setRiskNodes] = useState<RiskNode[]>(DEFAULT_RISK_NODES);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [backendLive, setBackendLive] = useState<boolean | null>(null);
  const [simulationPhase, setSimulationPhase] = useState<SimulationPhase>('nominal');
  const [logs, setLogs] = useState<LogEntry[]>([
    { ts: ts(), id: shortId(), msg: 'SYSTEM INITIALIZED — AUTONOMOUS SIMULATION ACTIVE', severity: 'nominal' },
  ]);

  const addLog = useCallback((msg: string, severity: LogEntry['severity'] = 'nominal') => {
    setLogs((prev) => [{ ts: ts(), id: shortId(), msg, severity }, ...prev].slice(0, 50));
  }, []);

  // INIT Backend Checks
  useEffect(() => {
    const init = async () => {
      try {
        const health = await getHealth();
        const live = health.status === 'OK';
        setBackendLive(live);
        if (live) addLog('BACKEND METRICS CONNECTED', 'nominal');
        const skus = ['Pharmaceuticals', 'Electronics', 'Consumer Goods'];
        const stockResults = await Promise.all(skus.map((s) => getSafetyStock(s)));
        setInventory(stockResults);
      } catch (e) {
        setBackendLive(false);
      }
    };
    init();
  }, [addLog]);

  // AUTONOMOUS SHIPS MOVEMENT TICKER
  useEffect(() => {
    const tickerEvent = setInterval(() => {
      setRoutes(prev => prev.map(r => ({
        ...r,
        progress: ((r.progress || 0) + 0.003) % 1.0
      })));
    }, 50);
    return () => clearInterval(tickerEvent);
  }, []);

  // AUTONOMOUS SIMULATION LOOP
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const runSimulationLoop = () => {
      // 1. Trigger Crisis
      setSimulationPhase('crisis');
      setRiskNodes((prev) => prev.map((n) => (n.id === 'RED_SEA_CORRIDOR' ? { ...n, risk_score: 0.95 } : n)));
      addLog('ORACLE: Severe geopolitical anomaly detected: RED SEA CORRIDOR (Risk: 0.95)', 'critical');

      timeoutId = setTimeout(() => {
        // 2. AI Rerouting
        setSimulationPhase('ai_rerouting');
        setRoutes([]); // clear ships briefly
        addLog('NAVIGATOR: Suez route compromised — computing AI alternatives...', 'warning');

        timeoutId = setTimeout(() => {
          setRiskNodes((prev) => {
            const ids = prev.map((n) => n.id);
            const extras = REROUTE_EXTRA_NODES.filter((n) => !ids.includes(n.id));
            return [...prev, ...extras];
          });
          addLog('NAVIGATOR: New waypoints mathematically verified — Dar es Salaam, Cape Town', 'nominal');
        }, 2000);

        timeoutId = setTimeout(() => {
          // 3. System Review
          setSimulationPhase('system_review');
          setRoutes(REROUTED_ROUTES.map(r => ({ ...r, progress: Math.random() * 0.3 })));
          addLog('NAVIGATOR: AI Rerouting active via Cape of Good Hope', 'warning');
          addLog('REVIEW: System confirms +$12,400 cost delta / +36h delay delta. Safety margins acceptable.', 'nominal');
          
          setInventory((prev) =>
            prev.map((s) => ({
              ...s,
              recommended_stock: Math.round(s.recommended_stock * 1.3),
              po_info: { ...s.po_info!, po_triggered: true, po_quantity: 50 },
            }))
          );
          addLog('BUFFER: Safety stock auto-recalculated — PO triggered dynamically', 'warning');
          
          // 4. Return to Nominal after a while to repeat simulation
          timeoutId = setTimeout(() => {
             setSimulationPhase('nominal');
             
             // Loop reset logic after 12 seconds
             timeoutId = setTimeout(() => {
                setRoutes(DEFAULT_ROUTES.map(r => ({ ...r, progress: Math.random() * 0.5 })));
                setRiskNodes(DEFAULT_RISK_NODES);
                setInventory(prev => prev.map(s => ({ ...s, po_info: { po_triggered: false, po_quantity: 0 } })));
                addLog('SIMULATION: Resetting state to nominal for next scenario.', 'nominal');
                timeoutId = setTimeout(runSimulationLoop, 4000);
             }, 12000);
          }, 5000);

        }, 4000);

      }, 3000);
    };

    // Start initial loop
    timeoutId = setTimeout(runSimulationLoop, 6000);

    return () => clearTimeout(timeoutId);
  }, [addLog]);

  return (
    <NexusContext.Provider value={{ routes, riskNodes, inventory, logs, backendLive, simulationPhase, addLog }}>
      {children}
    </NexusContext.Provider>
  );
};

export const useNexusContext = () => {
  const context = useContext(NexusContext);
  if (context === undefined) {
    throw new Error('useNexusContext must be used within a NexusProvider');
  }
  return context;
};
