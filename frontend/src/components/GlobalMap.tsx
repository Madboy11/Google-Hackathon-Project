import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';

const riskToColor = (score: number): [number, number, number] => {
  if (score > 0.8) return [255, 0, 0]; // Red
  if (score > 0.5) return [255, 165, 0]; // Orange
  return [0, 255, 0]; // Green
};

export const GlobalMap = ({ routes = [], riskNodes = [] }: { routes: any[], riskNodes: any[] }) => {
  const layers = [
    new ScatterplotLayer({
      id: 'risk-nodes',
      data: riskNodes,
      getPosition: (d: any) => [d.longitude, d.latitude],
      getFillColor: (d: any) => riskToColor(d.risk_score),
      getRadius: (d: any) => d.risk_score * 50000,
      pickable: true
    }),
    new ArcLayer({
      id: 'freight-routes',
      data: routes,
      getSourcePosition: (d: any) => d.origin,
      getTargetPosition: (d: any) => d.destination,
      getSourceColor: [0, 200, 255], // Cyan
      getTargetColor: [255, 100, 0], // Orange
      getWidth: 2,
    })
  ];

  return (
    <div className="relative w-full h-[500px] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      <DeckGL
        initialViewState={{ longitude: 20, latitude: 20, zoom: 2, pitch: 45 }}
        controller={true}
        layers={layers}
      />
    </div>
  );
};
