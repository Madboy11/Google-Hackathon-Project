// @ts-nocheck
import React from 'react';
import { useSupplyChainStore } from '../store/supplyChainStore';
import { Activity, Anchor, Navigation, ShieldAlert, Archive, BookOpen } from 'lucide-react';

export default function SystemStatusBar() {
  const systemStatus = useSupplyChainStore(s => s.systemStatus);
  const vessels      = useSupplyChainStore(s => s.vessels);
  const threats      = useSupplyChainStore(s => s.threats);
  const routes       = useSupplyChainStore(s => s.routes);
  const inventory    = useSupplyChainStore(s => s.inventory);
  const ledger       = useSupplyChainStore(s => s.ledgerEntries);

  const activeThreats = threats.filter(t => t.status === 'Active').length;
  const criticalInv   = inventory.filter(i => i.currentStock <= i.safetyStock).length;
  const inTransit     = routes.filter(r => r.status === 'active' || r.status === 'at_risk' || r.status === 'rerouting').length;

  return (
    <div className="h-10 shrink-0 flex items-center justify-between px-4 text-[11px] font-mono text-slate-400">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <Anchor size={11} className={inTransit > 0 ? 'text-blue-400' : 'text-slate-600'} />
          <span>Vessels In Transit: <span className={`font-medium ${inTransit > 0 ? 'text-blue-400' : 'text-slate-200'}`}>{inTransit}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldAlert size={11} className={activeThreats > 0 ? 'text-red-400' : 'text-slate-600'} />
          <span>Active Threats: <span className={`font-medium ${activeThreats > 0 ? 'text-red-400' : 'text-slate-200'}`}>{activeThreats}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Navigation size={11} className="text-violet-400" />
          <span>Routes: <span className="text-slate-200 font-medium">{routes.length}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Archive size={11} className={criticalInv > 0 ? 'text-orange-400' : 'text-slate-600'} />
          <span>Critical Stock: <span className={`font-medium ${criticalInv > 0 ? 'text-orange-400' : 'text-slate-200'}`}>{criticalInv}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen size={11} className="text-emerald-400" />
          <span>Ledger Tx: <span className="text-slate-200 font-medium">{ledger.length}</span></span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-slate-600">
        <span>Last Scan: {new Date(systemStatus.lastUpdated).toLocaleTimeString()}</span>
        <div className="flex items-center gap-1">
          <Activity size={9} className={systemStatus.apiHealth === 'Live' ? 'text-emerald-400' : 'text-red-400'} />
          <span className={systemStatus.apiHealth === 'Live' ? 'text-emerald-400' : 'text-red-400'}>
            API: {systemStatus.apiHealth}
          </span>
        </div>
      </div>
    </div>
  );
}
