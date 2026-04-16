import React, { useEffect, useState } from 'react';
import { GlobalMap } from './components/GlobalMap';
import { InventoryDashboard } from './components/InventoryDashboard';
import { DemoControls } from './components/DemoControls';
import { getCurrentRouting, getRiskScore, getSafetyStock } from './api/nexusApi';
import { Activity } from 'lucide-react';
import './index.css';

export default function App() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [riskNodes, setRiskNodes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  
  // Mock demand variance data
  const demandData = [
    { node: 'Node Alpha', demand_variance: 400 },
    { node: 'Node Beta', demand_variance: 300 },
    { node: 'Node Gamma', demand_variance: 550 },
  ];

  useEffect(() => {
    // Initial data fetch
    const fetchInit = async () => {
        const routesData = await getCurrentRouting();
        setRoutes(routesData);
        
        const risk = await getRiskScore('EU_PORT');
        setRiskNodes([
            { longitude: 35.23, latitude: 25.04, risk_score: 0.2, id: 'n1' },
            { longitude: 40.71, latitude: -74.00, risk_score: 0.1, id: 'n2' },
            { longitude: 38.00, latitude: 45.00, risk_score: risk.risk_score || 0.1, id: 'RED_SEA_CORRIDOR'}
        ]);
        
        const invA = await getSafetyStock('SKU-001');
        const invB = await getSafetyStock('SKU-002');
        setInventory([invA, invB]);
    };
    fetchInit();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 mb-8">
        <div className="flex items-center gap-3">
            <Activity className="text-cyan-400 w-10 h-10" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-mono">
                ⬡ NEXUS-SC <span className="text-cyan-400">OPS DASHBOARD</span>
            </h1>
        </div>
        <div className="text-sm text-slate-400 bg-slate-900 px-4 py-2 rounded border border-slate-800 font-mono">
            System Status: <span className="text-emerald-400 ml-2">● SECURE (mTLS / JWT)</span>
        </div>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="relative">
                <GlobalMap routes={routes} riskNodes={riskNodes} />
                <div className="absolute top-4 left-4">
                    <span className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1 rounded border border-slate-700 text-sm font-semibold">Live Threat Intel</span>
                </div>
            </div>
            <InventoryDashboard stockData={inventory} demandData={demandData} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
            <DemoControls />
            
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl mt-4">
                <h3 className="text-xl font-bold mb-4">Event Log (Ledger)</h3>
                <div className="space-y-4">
                    <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                        <div className="text-xs text-slate-400 mb-1">10:42 AM - ID: a9f8e4</div>
                        <div className="font-mono text-sm">System Normalized</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                        <div className="text-xs text-slate-400 mb-1">10:04 AM - ID: b29c1d</div>
                        <div className="font-mono text-emerald-400 text-sm">Compliance Verification: OK</div>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
