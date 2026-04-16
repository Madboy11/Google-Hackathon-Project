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
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans p-4 md:p-8 selection:bg-cyan-500/30">
      <div className="max-w-[1600px] mx-auto space-y-6">
          <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/60 pb-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-950/50 rounded-xl border border-cyan-800/50">
                    <Activity className="text-cyan-400 w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white font-mono flex items-center gap-2">
                        NEXUS-SC <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">OPS DASHBOARD</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Autonomous Supply Chain Intelligence</p>
                </div>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-950/30 px-4 py-2.5 rounded-lg border border-emerald-900/50 font-mono shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <ShieldCheck className="w-4 h-4" /> SECURE MODE
                </div>
                <button className="p-3 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors">
                    <Menu className="w-5 h-5 text-slate-300" />
                </button>
            </div>
          </header>
          
          <main className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 flex flex-col gap-6">
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none z-10"></div>
                    <GlobalMap routes={routes} riskNodes={riskNodes} />
                    <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
                        <span className="bg-slate-900/90 backdrop-blur-md text-slate-200 px-4 py-1.5 rounded-full border border-slate-700/50 text-xs font-bold tracking-wider flex items-center gap-2 shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            LIVE SATELLITE INTEL
                        </span>
                    </div>
                </div>
                <InventoryDashboard stockData={inventory} demandData={demandData} />
            </div>
            <div className="xl:col-span-1 flex flex-col gap-6">
                <DemoControls onTriggerEvent={handleDemoTrigger} />
                
                <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 shadow-2xl flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/50">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Terminal className="text-blue-400 w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-100 font-mono">LEDGER EVENTS</h3>
                    </div>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[500px]">
                        {logs.map((log, i) => (
                            <div key={i} className="p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors rounded-xl border border-slate-700/30 group">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-500 font-mono flex items-center gap-2">
                                        <Anchor className="w-3 h-3" /> {log.time}
                                    </span>
                                    <span className="text-xs text-slate-600 font-mono bg-slate-900 px-2 py-0.5 rounded">ID: {log.id}</span>
                                </div>
                                <div className={`font-mono text-sm leading-relaxed ${
                                    log.type === 'success' ? 'text-emerald-400' :
                                    log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'
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
