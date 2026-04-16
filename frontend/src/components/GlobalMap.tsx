import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';

const riskToColor = (score: number): [number, number, number] => {
  if (score > 0.8) return [239, 68, 68]; // Red-500
  if (score > 0.5) return [249, 115, 22]; // Orange-500
  return [16, 185, 129]; // Emerald-500
};

export const GlobalMap = ({ routes = [], riskNodes = [] }: { routes: any[], riskNodes: any[] }) => {
  const layers = [
    new ScatterplotLayer({
      id: 'risk-nodes',
      data: riskNodes,
      getPosition: (d: any) => [d.longitude, d.latitude],
      getFillColor: (d: any) => riskToColor(d.risk_score),
      getRadius: (d: any) => 30000 + (d.risk_score * 80000),
      pickable: true,
      stroked: true,
      getLineColor: [255, 255, 255, 80],
      lineWidthMinPixels: 2
    }),
    new ArcLayer({
      id: 'freight-routes',
      data: routes,
      getSourcePosition: (d: any) => d.origin,
      getTargetPosition: (d: any) => d.destination,
      getSourceColor: [34, 211, 238], // Cyan-400
      getTargetColor: [59, 130, 246], // Blue-500
      getWidth: 3,
    })
  ];

  return (
    <div className="relative w-full h-[600px] bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <DeckGL
        initialViewState={{ longitude: 35, latitude: 20, zoom: 2.5, pitch: 45 }}
        controller={true}
        layers={layers}
      />
      <div className="absolute bottom-4 left-4 z-10 flex gap-4 text-xs font-mono">
         <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500"></span> High Risk</div>
         <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-orange-500"></span> Med Risk</div>
         <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span> Safe</div>
      </div>
    </div>
  );
};
