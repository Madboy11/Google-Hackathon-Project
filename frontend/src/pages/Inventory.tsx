import React from 'react';
import { InventoryDashboard } from '../components/InventoryDashboard';
import { useNexusContext, DEMAND_DATA } from '../context/NexusContext';

export const Inventory: React.FC = () => {
  const { inventory } = useNexusContext();

  return (
    <div className="flex-1 flex flex-col bg-nexus-bg">
      <div className="p-5 border-b border-nexus-border shrink-0">
        <h2 className="text-xl font-grotesk tracking-widest text-white">INVENTORY CONTROL</h2>
        <p className="text-sm text-nexus-muted mt-1 uppercase">BUFFER Autonomous Stock Allocation</p>
      </div>
      <div className="flex-1 p-5 overflow-auto">
         <InventoryDashboard stockData={inventory} demandData={DEMAND_DATA} />
      </div>
    </div>
  );
};
