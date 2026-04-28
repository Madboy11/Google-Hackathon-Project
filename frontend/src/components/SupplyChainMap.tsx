// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer, TextLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSupplyChainStore } from '../store/supplyChainStore';

const INITIAL_VIEW_STATE = {
  longitude: 40,
  latitude: 15,
  zoom: 2.2,
  pitch: 15,
  bearing: 0,
};

// Route status → color [R,G,B,A]
const ROUTE_COLORS: Record<string, [number, number, number, number]> = {
  active:    [16, 185, 129, 220],
  rerouting: [234, 179,  8, 220],
  at_risk:   [239, 68,  68, 220],
  completed: [100, 116, 139, 160],
  cancelled: [100, 116, 139, 80],
};

// ── Vessel simulation: move a dot along waypoints ────────────────────────
function useSimulatedVessels(routes: any[]) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1500);
    return () => clearInterval(t);
  }, []);

  return useMemo(() => {
    const now = Date.now();
    return routes
      .filter(r => r.status === 'active' || r.status === 'at_risk' || r.status === 'rerouting')
      .map(route => {
        const wp = route.waypoints;
        if (!wp || wp.length < 2) return null;

        // Progress: cycle through route every ~120 seconds
        const created = new Date(route.createdAt).getTime();
        const elapsed = (now - created) / 1000;
        const cycleDuration = wp.length * 5; // 5 seconds per waypoint
        const progress = (elapsed % cycleDuration) / cycleDuration;

        const idx = Math.floor(progress * (wp.length - 1));
        const frac = (progress * (wp.length - 1)) - idx;
        const next = Math.min(idx + 1, wp.length - 1);

        const lon = wp[idx][0] + (wp[next][0] - wp[idx][0]) * frac;
        const lat = wp[idx][1] + (wp[next][1] - wp[idx][1]) * frac;

        // Calculate heading
        const dlat = wp[next][1] - wp[idx][1];
        const dlon = wp[next][0] - wp[idx][0];
        const heading = Math.atan2(dlon, dlat) * (180 / Math.PI);

        const isLand = route.mode === 'land';
        const prefix = isLand ? '🚛 Truck' : '🚢 MV';
        const defaultCarrier = isLand ? 'NEXUS Logistics' : 'NEXUS Auto';

        return {
          routeId: route.id,
          position: [lon, lat],
          name: `${prefix} ${route.carrier || defaultCarrier} · ${route.origin.replace('Port of ', '').slice(0, 6)} → ${route.destination.replace('Port of ', '').slice(0, 6)}`,
          status: route.status,
          mode: route.mode || 'sea',
          heading,
          speed: (isLand ? 45 : 12) + Math.random() * (isLand ? 15 : 4),
          progress: Math.round(progress * 100),
        };
      })
      .filter(Boolean);
  }, [routes, tick]);
}

export default function SupplyChainMap() {
  const vessels = useSupplyChainStore(state => state.vessels);
  const routes = useSupplyChainStore(state => state.routes);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [weatherKey, setWeatherKey] = useState<string>('');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/config/weather-key`)
      .then(r => r.json())
      .then(d => { if (d.key) setWeatherKey(d.key); })
      .catch(() => {});
  }, []);

  // Simulated vessels moving along routes
  const simVessels = useSimulatedVessels(routes);

  // Total vessel count = real AIS + simulated
  const setVessels = useSupplyChainStore(s => s.setVessels);

  // Endpoint dots for all routes (origin + dest)
  const routeEndpoints = useMemo(() =>
    routes.flatMap(r => [
      { pos: r.originCoords, label: r.origin.replace('Port of ', ''), type: 'origin', routeId: r.id, status: r.status },
      { pos: r.destCoords,   label: r.destination.replace('Port of ', ''), type: 'dest', routeId: r.id, status: r.status },
    ]),
  [routes]);

  const layers = useMemo(() => [
    // ── Live Weather Radar (OpenWeatherMap Precipitation) ──
    weatherKey ? new TileLayer({
      id: 'weather-radar',
      data: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${weatherKey}`,
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      renderSubLayers: (props: any) => {
        const { boundingBox } = props.tile;
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]],
          transparentColor: [0, 0, 0, 0],
          opacity: 0.6
        });
      }
    }) : null,
    // ── Active routes (PathLayer per route for distinct colors) ──
    ...routes.map(route =>
      new PathLayer({
        id: `route-${route.id}`,
        data: [route],
        getPath: (d: any) => d.waypoints,
        getColor: ROUTE_COLORS[route.status] ?? ROUTE_COLORS.active,
        getWidth: route.status === 'at_risk' || route.status === 'rerouting' ? 3.5 : 2,
        widthUnits: 'pixels',
        pickable: true,
        onHover: ({ object, x, y }: any) => {
          if (object) {
            setTooltip({
              x, y,
              text: `${object.origin} → ${object.destination}\nRisk: ${Math.round(object.riskScore * 100)}% | ${object.estimatedDays}d | $${(object.costUSD/1000).toFixed(0)}k\nWaypoints: ${object.waypoints.length}`,
            });
          } else {
            setTooltip(null);
          }
        },
        getDashArray: route.status === 'at_risk' ? [6, 4] : undefined,
      })
    ),

    // ── Route endpoint dots (ports) ──
    new ScatterplotLayer({
      id: 'route-endpoints',
      data: routeEndpoints,
      getPosition: (d: any) => d.pos,
      getFillColor: (d: any) => d.type === 'origin' ? [16, 185, 129, 255] : [139, 92, 246, 255],
      getRadius: 18000,
      radiusMinPixels: 4,
      radiusMaxPixels: 8,
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

    // ── Simulated vessel dots (moving along routes) ──
    new ScatterplotLayer({
      id: 'sim-vessels',
      data: simVessels,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) =>
        d.status === 'at_risk' ? [239, 68, 68, 255] :
        d.status === 'rerouting' ? [234, 179, 8, 255] :
        d.mode === 'land' ? [249, 115, 22, 255] : // Orange for trucks
        d.mode === 'air' ? [250, 204, 21, 255] : // Yellow for planes
        [59, 130, 246, 255], // Blue for ships
      getRadius: 22000,
      radiusMinPixels: 5,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: ({ object, x, y }: any) => {
        if (object) {
          const icon = object.mode === 'air' ? '✈️' : object.mode === 'land' ? '🚚' : '🚢';
          setTooltip({
            x, y,
            text: `${icon} ${object.name}\nSpeed: ${object.speed.toFixed(1)} kn | Heading: ${Math.round(object.heading)}°\nProgress: ${object.progress}%`,
          });
        } else {
          setTooltip(null);
        }
      },
    }),

    // ── Vessel glow ring ──
    new ScatterplotLayer({
      id: 'sim-vessels-glow',
      data: simVessels,
      getPosition: (d: any) => d.position,
      getFillColor: [0, 0, 0, 0],
      getLineColor: (d: any) =>
        d.status === 'at_risk' ? [239, 68, 68, 100] :
        [59, 130, 246, 100],
      getRadius: 35000,
      radiusMinPixels: 8,
      radiusMaxPixels: 14,
      stroked: true,
      lineWidthPixels: 1.5,
      pickable: false,
    }),

    // ── Real AIS vessel dots (if any) ──
    new ScatterplotLayer({
      id: 'ais-vessels',
      data: vessels,
      getPosition: (d: any) => [d.lon, d.lat],
      getFillColor: [16, 185, 129, 220],
      getRadius: 12000,
      radiusMinPixels: 3,
      pickable: true,
      onHover: ({ object, x, y }: any) => {
        if (object) setTooltip({ x, y, text: `AIS: ${object.vessel_name}\nMMSI: ${object.mmsi}\nSpeed: ${object.speed} kn` });
        else setTooltip(null);
      },
    }),
  ].filter(Boolean), [vessels, routes, routeEndpoints, simVessels]);

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

      {/* Route legend overlay */}
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
                {r.origin.replace('Port of ', '').slice(0, 10)} → {r.destination.replace('Port of ', '').slice(0, 10)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Vessel count badge */}
      {simVessels.length > 0 && (
        <div className="absolute bottom-10 left-2 flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono pointer-events-none"
          style={{ background: 'rgba(8,12,24,0.85)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-blue-400">{simVessels.length} vessel{simVessels.length > 1 ? 's' : ''} in transit</span>
        </div>
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-300 whitespace-pre z-50"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10, background: 'rgba(8,12,24,0.92)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
