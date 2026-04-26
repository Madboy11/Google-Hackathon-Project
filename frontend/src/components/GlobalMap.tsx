import { useState, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer, TextLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// ─── Types ───
interface RouteData {
  origin: [number, number];
  destination: [number, number];
  risk_score?: number;
  route_id?: string;
  originLabel?: string;
  destLabel?: string;
  progress?: number;
}

interface RiskNode {
  longitude: number;
  latitude: number;
  risk_score: number;
  id: string;
  label?: string;
}

interface GlobalMapProps {
  routes?: RouteData[];
  riskNodes?: RiskNode[];
}

// ─── Color Helpers ───
const riskToFill = (score: number): [number, number, number, number] => {
  if (score > 0.8) return [255, 70, 70, 230];
  if (score > 0.5) return [255, 170, 50, 210];
  return [80, 220, 140, 190];
};

const riskToRing = (score: number): [number, number, number, number] => {
  if (score > 0.8) return [255, 100, 100, 120];
  if (score > 0.5) return [255, 200, 100, 100];
  return [100, 240, 160, 80];
};

// Free dark basemap — CARTO dark matter (no key required)
const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const INITIAL_VIEW = {
  longitude: 42,
  latitude: 15,
  zoom: 2.3,
  pitch: 35,
  bearing: 8,
};

export const GlobalMap = ({ routes = [], riskNodes = [] }: GlobalMapProps) => {
  const [viewState, setViewState] = useState(INITIAL_VIEW);

  const onViewStateChange = useCallback(({ viewState: vs }: any) => {
    setViewState(vs);
  }, []);

  // ─── Label data derived from nodes ───
  const labelData = riskNodes
    .filter((n) => n.label)
    .map((n) => ({
      position: [n.longitude, n.latitude] as [number, number],
      text: n.label!.toUpperCase(),
      risk: n.risk_score,
    }));

  // ─── Layers ───
  const layers = [
    // Outer glow ring for each node
    new ScatterplotLayer({
      id: 'risk-glow',
      data: riskNodes,
      getPosition: (d: RiskNode) => [d.longitude, d.latitude],
      getFillColor: (d: RiskNode) => riskToRing(d.risk_score),
      getRadius: (d: RiskNode) => 45000 + d.risk_score * 120000,
      pickable: false,
      stroked: false,
      updateTriggers: {
        getFillColor: riskNodes.map((n) => n.risk_score),
        getRadius: riskNodes.map((n) => n.risk_score),
      },
      transitions: {
        getRadius: { duration: 1000, easing: (t: number) => t * (2 - t) },
        getFillColor: { duration: 800 },
      },
    }),

    // Core node dots
    new ScatterplotLayer({
      id: 'risk-nodes',
      data: riskNodes,
      getPosition: (d: RiskNode) => [d.longitude, d.latitude],
      getFillColor: (d: RiskNode) => riskToFill(d.risk_score),
      getRadius: (d: RiskNode) => 18000 + d.risk_score * 40000,
      pickable: true,
      stroked: true,
      getLineColor: [255, 255, 255, 100],
      lineWidthMinPixels: 1,
      updateTriggers: {
        getFillColor: riskNodes.map((n) => n.risk_score),
        getRadius: riskNodes.map((n) => n.risk_score),
      },
      transitions: {
        getRadius: { duration: 1000, easing: (t: number) => t * (2 - t) },
        getFillColor: { duration: 800 },
      },
    }),

    // Background track (faded)
    new LineLayer({
      id: 'freight-routes-bg',
      data: routes,
      getSourcePosition: (d: RouteData) => d.origin,
      getTargetPosition: (d: RouteData) => d.destination,
      getColor: [130, 80, 255, 40],
      getWidth: 2,
    }),

    // Active track (drawn dynamically based on progress)
    new LineLayer({
      id: 'freight-routes-active',
      data: routes,
      getSourcePosition: (d: RouteData) => d.origin,
      getTargetPosition: (d: RouteData) => {
        const t = d.progress || 0;
        return [
          d.origin[0] + (d.destination[0] - d.origin[0]) * t,
          d.origin[1] + (d.destination[1] - d.origin[1]) * t,
        ] as [number, number];
      },
      getColor: [0, 220, 255, 200],
      getWidth: 3,
      updateTriggers: {
        getTargetPosition: routes.map((r) => r.progress || 0),
      },
    }),

    // Ships moving along routes (at the head of the active track)
    new ScatterplotLayer({
      id: 'ships',
      data: routes,
      getPosition: (d: RouteData) => {
        const t = d.progress || 0;
        return [
          d.origin[0] + (d.destination[0] - d.origin[0]) * t,
          d.origin[1] + (d.destination[1] - d.origin[1]) * t,
        ] as [number, number];
      },
      getFillColor: [255, 255, 255, 255],
      getRadius: 40000,
      pickable: true,
      stroked: true,
      getLineColor: [0, 255, 255, 255],
      lineWidthMinPixels: 2,
      updateTriggers: {
        getPosition: routes.map((r) => r.progress || 0),
      },
    }),

    // Node labels
    new TextLayer({
      id: 'node-labels',
      data: labelData,
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.text,
      getSize: 11,
      getColor: [200, 200, 200, 200],
      getPixelOffset: [0, -22],
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      outlineWidth: 2,
      outlineColor: [10, 10, 10, 200],
      billboard: true,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
    }),
  ];

  return (
    <div className="relative w-full h-[560px] overflow-hidden">
      <DeckGL
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={true}
        layers={layers}
      >
        <Map
          mapStyle={BASEMAP}
          attributionControl={false}
        />
      </DeckGL>

      {/* Legend — bottom-left, over map */}
      <div className="absolute bottom-3 left-4 z-20 flex items-center gap-5 text-[10px] font-grotesk tracking-[0.12em] text-neutral-400 bg-black/60 px-3 py-1.5 border border-neutral-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-red-500 inline-block"></span> CRITICAL
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-amber-400 inline-block"></span> ELEVATED
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-400 inline-block"></span> NOMINAL
        </div>
      </div>

      {/* Route direction indicator */}
      <div className="absolute bottom-3 right-4 z-20 flex items-center gap-2 text-[10px] font-grotesk tracking-[0.1em] text-neutral-500 bg-black/60 px-3 py-1.5 border border-neutral-800">
        <span className="w-3 h-[2px] bg-cyan-400 inline-block"></span>
        <span>ORIGIN</span>
        <span className="text-neutral-700">→</span>
        <span className="w-3 h-[2px] bg-purple-500/60 inline-block"></span>
        <span>DEST</span>
      </div>
    </div>
  );
};
