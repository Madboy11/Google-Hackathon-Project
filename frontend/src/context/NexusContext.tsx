import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { RouteData, RiskNode, StockItem, LogEntry } from '../types';
import { getCurrentRouting, getRiskScore, getSafetyStock, getHealth } from '../api/nexusApi';

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

export const DEMAND_DATA = [
  { node: 'Rotterdam', demand_variance: 420 },
  { node: 'Singapore', demand_variance: 310 },
  { node: 'Port Said', demand_variance: 580 },
  { node: 'New York', demand_variance: 240 },
];

const ts = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const shortId = () => Math.random().toString(36).substring(2, 8);

interface NexusContextProps {
  routes: RouteData[];
  riskNodes: RiskNode[];
  inventory: StockItem[];
  logs: LogEntry[];
  backendLive: boolean | null;
  addLog: (msg: string, severity?: LogEntry['severity']) => void;
  triggerDemoEvent: () => void;
}

const NexusContext = createContext<NexusContextProps | undefined>(undefined);

export const NexusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  useEffect(() => {
    const init = async () => {
      try {
        const health = await getHealth();
        const live = health.status === 'OK';
        setBackendLive(live);
        addLog(live ? 'BACKEND CONNECTED — localhost:8000' : 'BACKEND OFFLINE — MOCK MODE ACTIVE', live ? 'nominal' : 'warning');
  
        const riskResult = await getRiskScore('RED_SEA_CORRIDOR');
        setRiskNodes((prev) => prev.map((n) => n.id === 'RED_SEA_CORRIDOR' ? { ...n, risk_score: riskResult.risk_score ?? 0.2 } : n));
  
        const routingResult = await getCurrentRouting();
        if (Array.isArray(routingResult) && routingResult.length > 0 && routingResult[0].vessel_id) {
          addLog(`NAVIGATOR: ${routingResult.length} active vessels tracked`);
        }
  
        const skus = ['SKU-ABC', 'SKU-XYZ'];
        const stockResults = await Promise.all(skus.map((s) => getSafetyStock(s)));
        setInventory(stockResults);
        addLog(`BUFFER: ${stockResults.length} SKUs loaded`);
      } catch (e) {
          setBackendLive(false);
          addLog('BACKEND OFFLINE — MOCK MODE ACTIVE', 'warning');
      }
    };
    init();
  }, [addLog]);

  const triggerDemoEvent = useCallback(() => {
    setRiskNodes((prev) => prev.map((n) => (n.id === 'RED_SEA_CORRIDOR' ? { ...n, risk_score: 0.95 } : n)));
    addLog('ORACLE: Red Sea corridor risk → 0.95 (CRITICAL)', 'critical');

    setTimeout(() => {
      setRoutes([]);
      addLog('NAVIGATOR: Suez route BLOCKED — computing alternatives...', 'warning');
    }, 800);

    setTimeout(() => {
      setRiskNodes((prev) => {
        const ids = prev.map((n) => n.id);
        const extras = REROUTE_EXTRA_NODES.filter((n) => !ids.includes(n.id));
        return [...prev, ...extras];
      });
      addLog('NAVIGATOR: Waypoints identified — Dar es Salaam, Cape Town', 'warning');
    }, 1500);

    setTimeout(() => {
      setRoutes(REROUTED_ROUTES);
      addLog('NAVIGATOR: Rerouting via Cape of Good Hope', 'warning');
      addLog('NAVIGATOR: +$12,400 cost delta / +36h delay delta', 'warning');
    }, 2200);

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
    <NexusContext.Provider value={{ routes, riskNodes, inventory, logs, backendLive, addLog, triggerDemoEvent }}>
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
