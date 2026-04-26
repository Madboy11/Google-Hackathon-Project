import React, { useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer, IconLayer, TextLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSupplyChainStore } from '../store/supplyChainStore';

const INITIAL_VIEW_STATE = {
  longitude: 20,
  latitude: 20,
  zoom: 2,
  pitch: 20,
  bearing: 0,
};

// Route status → color [R,G,B,A]
const ROUTE_COLORS: Record<string, [number, number, number, number]> = {
  active:    [16, 185, 129, 220],   // emerald
  rerouting: [234, 179,  8, 220],   // yellow – animating
  at_risk:   [239, 68,  68, 220],   // red
  completed: [100, 116, 139, 160],  // slate dim
  cancelled: [100, 116, 139, 80],   // very dim
};

export default function SupplyChainMap() {
  const vessels = useSupplyChainStore(state => state.vessels);
  const routes = useSupplyChainStore(state => state.routes);
  const disruptions = useSupplyChainStore(state => state.disruptions);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Endpoint dots for all routes (origin + dest)
  const routeEndpoints = useMemo(() =>
    routes.flatMap(r => [
      { pos: r.originCoords, label: r.origin.replace('Port of ', ''), type: 'origin', routeId: r.id, status: r.status },
      { pos: r.destCoords,   label: r.destination.replace('Port of ', ''), type: 'dest', routeId: r.id, status: r.status },
    ]),
  [routes]);

  const layers = useMemo(() => [
    // ── Disruption heatmap ──
    new HeatmapLayer({
      id: 'heatmap',
      data: disruptions,
      getPosition: (d: any) => [d.lon, d.lat],
      getWeight: (d: any) => d.severity_score,
      radiusPixels: 60,
    }),

    // ── Active routes (PathLayer per route for distinct colors) ──
    ...routes.map(route =>
      new PathLayer({
        id: `route-${route.id}`,
        data: [route],
        getPath: (d: any) => d.waypoints,
        getColor: ROUTE_COLORS[route.status] ?? ROUTE_COLORS.active,
        getWidth: route.status === 'at_risk' || route.status === 'rerouting' ? 4 : 2.5,
        widthUnits: 'pixels',
        pickable: true,
        onHover: ({ object, x, y }: any) => {
          if (object) {
            setTooltip({
              x, y,
              text: `${object.origin} → ${object.destination}\nRisk: ${Math.round(object.riskScore * 100)}% | ${object.estimatedDays}d | $${(object.costUSD/1000).toFixed(0)}k`,
            });
          } else {
            setTooltip(null);
          }
        },
        // Dash effect for at-risk routes
        getDashArray: route.status === 'at_risk' ? [6, 4] : undefined,
      })
    ),

    // ── Route endpoint dots ──
    new ScatterplotLayer({
      id: 'route-endpoints',
      data: routeEndpoints,
      getPosition: (d: any) => d.pos,
      getFillColor: (d: any) => d.type === 'origin' ? [16, 185, 129, 255] : [239, 68, 68, 255],
      getRadius: 12000,
      pickable: false,
    }),

    // ── Port labels ──
    new TextLayer({
      id: 'port-labels',
      data: routeEndpoints,
      getPosition: (d: any) => d.pos,
      getText: (d: any) => d.label,
      getSize: 11,
      getColor: [200, 200, 200, 200],
      getPixelOffset: [0, -18],
      background: true,
      getBackgroundColor: [10, 15, 30, 200],
      backgroundPadding: [4, 2, 4, 2],
      fontFamily: 'monospace',
    }),

    // ── Live vessel dots ──
    new ScatterplotLayer({
      id: 'vessels',
      data: vessels,
      getPosition: (d: any) => [d.lon, d.lat],
      getFillColor: [59, 130, 246, 220],
      getRadius: 8000,
      pickable: true,
      onHover: ({ object, x, y }: any) => {
        if (object) setTooltip({ x, y, text: object.vessel_name });
        else setTooltip(null);
      },
    }),
  ].filter(Boolean), [vessels, routes, disruptions, routeEndpoints]);

  return (
    <div className="relative w-full h-full">
      <DeckGL
        // @ts-ignore
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      >
        <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" />
      </DeckGL>

      {/* Route count overlay */}
      {routes.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
          {routes.map(r => (
            <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono"
              style={{ background: 'rgba(8,12,24,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-2 h-0.5 rounded-full" style={{
                background: r.status === 'active' ? '#10b981' :
                  r.status === 'at_risk' ? '#ef4444' :
                  r.status === 'rerouting' ? '#eab308' : '#64748b'
              }} />
              <span style={{ color: r.status === 'at_risk' ? '#ef4444' : r.status === 'rerouting' ? '#eab308' : '#94a3b8' }}>
                {r.origin.replace('Port of ', '').slice(0, 8)} → {r.destination.replace('Port of ', '').slice(0, 8)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-300 whitespace-pre"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10, background: 'rgba(8,12,24,0.92)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
