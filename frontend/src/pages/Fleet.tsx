import React from 'react';
import { GlobalMap } from '../components/GlobalMap';
import { useNexusContext } from '../context/NexusContext';

export const Fleet: React.FC = () => {
  const { routes, riskNodes } = useNexusContext();

  return (
    <div className="flex-1 flex flex-col bg-nexus-bg">
      <div className="p-5 border-b border-nexus-border shrink-0">
        <h2 className="text-xl font-grotesk tracking-widest text-white">FLEET LOGISTICS</h2>
        <p className="text-sm text-nexus-muted mt-1 uppercase">NAVIGATOR Reinforcement Learning Routing Engine</p>
      </div>
      <div className="flex-1 relative">
         <div className="absolute top-4 left-5 z-20">
            <div className="nexus-label">ACTIVE VESSEL TRACKING</div>
            <div className="mt-2 text-xs text-nexus-text p-3 bg-black/60 backdrop-blur-md border border-nexus-border text-left">
              Total Tracked: 32 Vessels<br/>
              Algorithm: PPO Reroute<br/>
              Priority: Demurrage / Carbon Emission
            </div>
         </div>
         <GlobalMap routes={routes} riskNodes={riskNodes} />
      </div>
    </div>
  );
};
