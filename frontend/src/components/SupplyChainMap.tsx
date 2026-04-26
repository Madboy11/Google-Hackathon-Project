import React, { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer, IconLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSupplyChainStore } from '../store/supplyChainStore';

const INITIAL_VIEW_STATE = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  pitch: 0,
  bearing: 0
};

export default function SupplyChainMap() {
  const vessels = useSupplyChainStore(state => state.vessels);
  const routes = useSupplyChainStore(state => state.routes);
  const disruptions = useSupplyChainStore(state => state.disruptions);

  const layers = useMemo(() => [
    new HeatmapLayer({
      id: 'heatmap-layer',
      data: disruptions,
      getPosition: (d: any) => [d.lon, d.lat],
      getWeight: (d: any) => d.severity_score,
      radiusPixels: 60,
    }),
    new ScatterplotLayer({
      id: 'vessel-layer',
      data: vessels,
      getPosition: (d: any) => [d.lon, d.lat],
      getFillColor: [59, 130, 246], // accent
      getRadius: 10000,
      pickable: true,
    }),
    routes && new PathLayer({
      id: 'route-layer',
      data: [routes],
      getPath: (d: any) => d.recommended_route_waypoints,
      getColor: [16, 185, 129], // success
      getWidth: 3,
      widthUnits: 'pixels'
    })
  ].filter(Boolean), [vessels, routes, disruptions]);

  return (
    <div className="relative w-full h-full bg-surface">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        />
      </DeckGL>
    </div>
  );
}
