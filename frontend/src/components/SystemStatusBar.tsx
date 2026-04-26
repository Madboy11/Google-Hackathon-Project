import React from 'react';
import { useSupplyChainStore } from '../store/supplyChainStore';
import { Activity, Anchor, Route, AlertCircle } from 'lucide-react';

export default function SystemStatusBar() {
  const { systemStatus, vessels, disruptions, routes } = useSupplyChainStore();

  return (
    <div className="h-12 shrink-0 bg-background border-b border-gray-800 flex items-center justify-between px-4 text-sm text-text-primary">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-accent" />
          <span>Vessels Tracked: {vessels.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-danger" />
          <span>Active Disruptions: {disruptions.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-success" />
          <span>Routes Optimised: {routes ? 1 : 0}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span>Last Scan: {new Date(systemStatus.lastUpdated).toLocaleTimeString()}</span>
        <div className="flex items-center gap-1">
          <Activity className={`w-3 h-3 ${systemStatus.apiHealth === 'Live' ? 'text-success' : 'text-danger'}`} />
          <span>API Status: {systemStatus.apiHealth}</span>
        </div>
      </div>
    </div>
  );
}
