import React, { useEffect } from 'react';
import SupplyChainMap from './components/SupplyChainMap';
import AgentPanel from './components/AgentPanel';
import AlertFeed from './components/AlertFeed';
import SystemStatusBar from './components/SystemStatusBar';
import { useSupplyChainStore } from './store/supplyChainStore';

function App() {
  const { setSystemStatus, setVessels } = useSupplyChainStore();

  useEffect(() => {
    // Health polling
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://127.0.0.1:8001/health');
        if (res.ok) {
          setSystemStatus({ apiHealth: 'Live', lastUpdated: new Date().toISOString() });
        } else {
          setSystemStatus({ apiHealth: 'Degraded', lastUpdated: new Date().toISOString() });
        }
      } catch (e) {
        setSystemStatus({ apiHealth: 'Offline', lastUpdated: new Date().toISOString() });
      }
    }, 10000);

    // Initial Health Check
    fetch('http://127.0.0.1:8001/health').then(res => {
        if(res.ok) setSystemStatus({ apiHealth: 'Live', lastUpdated: new Date().toISOString() });
    }).catch(() => setSystemStatus({ apiHealth: 'Offline', lastUpdated: new Date().toISOString() }));

    // WebSocket connection to ws_proxy
    const ws = new WebSocket('ws://127.0.0.1:8001/ws');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'heartbeat' || data.type === 'ping') {
           // Connection alive
        } else if (data.Message && data.Message.PositionReport) {
           // We map aisstream format to our format
           const report = data.Message.PositionReport;
           const newVessel = {
             mmsi: data.MetaData.MMSI.toString(),
             lat: report.Latitude,
             lon: report.Longitude,
             speed: report.Sog,
             heading: report.TrueHeading,
             vessel_name: data.MetaData.ShipName || "Unknown",
             flag: ""
           };
           // update vessels (simplified, in reality you'd want to merge)
           useSupplyChainStore.setState(state => {
              const newVessels = [...state.vessels];
              const idx = newVessels.findIndex(v => v.mmsi === newVessel.mmsi);
              if (idx >= 0) newVessels[idx] = newVessel;
              else newVessels.push(newVessel);
              return { vessels: newVessels };
           });
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    };

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [setSystemStatus, setVessels]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background font-inter text-text-primary">
      <SystemStatusBar />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[280px] shrink-0 border-r border-gray-800">
          <AlertFeed />
        </div>
        <div className="flex-1 relative">
          {/* Using Map skeleton loader conditionally if map API fails, but DeckGL handles itself usually */}
          <SupplyChainMap />
        </div>
        <div className="shrink-0 border-l border-gray-800">
          <AgentPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
