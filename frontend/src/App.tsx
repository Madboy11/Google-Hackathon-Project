import React, { useEffect, useState } from 'react';
import { GlobalMap } from './components/GlobalMap';
import { InventoryDashboard } from './components/InventoryDashboard';
import { DemoControls } from './components/DemoControls';
import { getCurrentRouting, getRiskScore, getSafetyStock } from './api/nexusApi';
import { Activity, ShieldCheck, Menu, Terminal, Anchor } from 'lucide-react';
import './index.css';

export default function App() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [riskNodes, setRiskNodes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [logs, setLogs] = useState<{time: string, id: string, msg: string, type: 'info'|'success'|'warning'}[]>([
    { time: "10:42 AM", id: "a9f8e4", msg: "System Normalized", type: "info" },
    { time: "10:04 AM", id: "b29c1d", msg: "Compliance Verification: OK", type: "success" }
  ]);

  const defaultRoutes = [
      { origin: [35.23, 25.04], destination: [103.81, 1.35], risk_score: 0.1, route_id: "r1" } // Mock Suez Route
  ];

  const reroutedRoutes = [
      { origin: [35.23, 25.04], destination: [18.42, -33.92], risk_score: 0.4, route_id: "r1_a" }, // To Cape of Good Hope
      { origin: [18.42, -33.92], destination: [103.81, 1.35], risk_score: 0.1, route_id: "r1_b" }  // Cape to Singapore
  ];

  // Mock demand variance data
  const demandData = [
    { node: 'Node Alpha', demand_variance: 400 },
    { node: 'Node Beta', demand_variance: 300 },
    { node: 'Node Gamma', demand_variance: 550 },
  ];

  useEffect(() => {
    const fetchInit = async () => {
        const routesData = await getCurrentRouting();
        setRoutes(routesData.length > 0 ? defaultRoutes : routesData);
        
        const risk = await getRiskScore('EU_PORT');
        setRiskNodes([
            { longitude: 35.23, latitude: 25.04, risk_score: 0.2, id: 'n1' },
            { longitude: 40.71, latitude: -74.00, risk_score: 0.1, id: 'n2' },
            { longitude: 38.00, latitude: 45.00, risk_score: risk.risk_score || 0.1, id: 'RED_SEA_CORRIDOR'},
            { longitude: 103.81, latitude: 1.35, risk_score: 0.05, id: 'n3' }
        ]);
        
        const invA = await getSafetyStock('SKU-001');
        const invB = await getSafetyStock('SKU-002');
        setInventory([invA, invB]);
    };
    fetchInit();
  }, []);

  const handleDemoTrigger = () => {
    // 1. Update Map Routes
    setRoutes(reroutedRoutes);
    
    // 2. Update Risk Node visually
    setRiskNodes(prev => prev.map(n => n.id === 'RED_SEA_CORRIDOR' ? { ...n, risk_score: 0.95 } : n));
    
    // 3. Add to event log
    const now = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    setLogs(prev => [
        { time: now, id: "r8e4a9", msg: "NAVIGATOR: Rerouting via Cape of Good Hope", type: "warning" },
        { time: now, id: "k7c21f", msg: "FORTRESS: Red Sea Security Anomaly Detected", type: "warning" },
        ...prev
    ]);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-300 font-sans p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
          <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-800 pb-6">
            <div className="flex items-center gap-4">
                <div>
                    <Activity className="text-stone-100 w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-stone-100 font-mono flex items-center gap-2">
                        NEXUS-SC <span className="text-stone-500">OPS DASHBOARD</span>
                    </h1>
                    <p className="text-stone-500 text-xs mt-1 uppercase tracking-widest">Autonomous Supply Chain</p>
                </div>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-stone-400 bg-stone-900 px-3 py-1.5 rounded border border-stone-800 font-mono">
                    <ShieldCheck className="w-3 h-3" /> SECURE MODE
                </div>
                <button className="p-2 hover:bg-stone-900 rounded border border-transparent hover:border-stone-800 transition-colors">
                    <Menu className="w-5 h-5 text-stone-400" />
                </button>
            </div>
          </header>
          
          <main className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 flex flex-col gap-6">
                <div className="relative rounded-lg overflow-hidden border border-stone-800 bg-stone-900">
                    <GlobalMap routes={routes} riskNodes={riskNodes} />
                    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                        <span className="bg-stone-900 text-stone-300 px-3 py-1 rounded border border-stone-800 text-xs font-mono tracking-wide flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                            LIVE SATELLITE INTEL
                        </span>
                    </div>
                </div>
                <InventoryDashboard stockData={inventory} demandData={demandData} />
            </div>
            <div className="xl:col-span-1 flex flex-col gap-6">
                <DemoControls onTriggerEvent={handleDemoTrigger} />
                
                <div className="bg-stone-900 p-5 rounded-lg border border-stone-800 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-800">
                        <Terminal className="text-stone-400 w-4 h-4" />
                        <h3 className="text-sm font-bold text-stone-200 font-mono tracking-wider">LEDGER EVENTS</h3>
                    </div>
                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[500px]">
                        {logs.map((log, i) => (
                            <div key={i} className="py-2 border-b border-stone-800/50 last:border-0 group">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                                        <Anchor className="w-3 h-3" /> {log.time}
                                    </span>
                                    <span className="text-[10px] text-stone-500 font-mono">ID: {log.id}</span>
                                </div>
                                <div className={`font-mono text-xs leading-relaxed ${
                                    log.type === 'success' ? 'text-stone-300' :
                                    log.type === 'warning' ? 'text-stone-100 font-medium' : 'text-stone-400'
                                }`}>
                                    {log.type === 'warning' && '> '}
                                    {log.msg}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </main>
      </div>
    </div>
  );
}
