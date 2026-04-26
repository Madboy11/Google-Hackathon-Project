// @ts-nocheck
import React from 'react';
import { GlobalMap } from '../components/GlobalMap';
import { InventoryDashboard } from '../components/InventoryDashboard';
import { DemoControls } from '../components/DemoControls';
import { SystemDiagnostics } from '../components/SystemDiagnostics';
import { useNexusContext, DEMAND_DATA } from '../context/NexusContext';

export const Dashboard: React.FC = () => {
  const { routes, riskNodes, inventory, logs, triggerDemoEvent } = useNexusContext();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-px bg-nexus-border flex-1">
      {/* Left Column */}
      <div className="bg-nexus-bg flex flex-col gap-px h-full">
        {/* Map Section */}
        <div className="nexus-panel relative flex-shrink-0 h-[60vh] xl:h-[55vh]">
          <div className="absolute top-4 left-5 z-20">
            <div className="nexus-label">THREAT INTELLIGENCE — LIVE</div>
          </div>
          <GlobalMap routes={routes} riskNodes={riskNodes} />
        </div>

        {/* Inventory Section */}
        <div className="flex-1 overflow-auto bg-nexus-bg">
            <InventoryDashboard stockData={inventory} demandData={DEMAND_DATA} />
        </div>
      </div>

      {/* Right Column */}
      <div className="bg-nexus-bg flex flex-col gap-px h-full overflow-hidden">
        <SystemDiagnostics />
        <DemoControls onTriggerEvent={triggerDemoEvent} />

        {/* Event Log */}
        <div className="nexus-panel p-5 flex-1 flex flex-col min-h-0">
          <div className="nexus-label mb-3">EVENT LOG (LATEST)</div>
          <div className="flex-1 overflow-y-auto space-y-0 min-h-0">
            {logs.slice(0, 15).map((log, i) => (
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
  );
};
