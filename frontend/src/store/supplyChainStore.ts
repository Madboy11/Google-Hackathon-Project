import { create } from 'zustand';

export interface Vessel {
  mmsi: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  vessel_name: string;
  flag: string;
}

export interface Disruption {
  title: string;
  summary: string;
  severity_score: number;
  lat: number;
  lon: number;
  timestamp: string;
  source_url: string;
}

export interface RouteData {
  recommended_route_waypoints: [number, number][];
  estimated_days: number;
  cost_usd: number;
  risk_adjusted_score: number;
  alternative_routes: any[];
}

export interface AgentMessage {
  id: string;
  content: string;
  role: 'agent' | 'user' | 'system';
  timestamp: string;
}

export interface SystemStatus {
  apiHealth: string;
  lastUpdated: string;
}

interface SupplyChainState {
  vessels: Vessel[];
  disruptions: Disruption[];
  routes: RouteData | null;
  agentMessages: AgentMessage[];
  systemStatus: SystemStatus;
  
  setVessels: (vessels: Vessel[]) => void;
  setDisruptions: (disruptions: Disruption[]) => void;
  setRoutes: (routes: RouteData) => void;
  addAgentMessage: (message: AgentMessage) => void;
  setSystemStatus: (status: SystemStatus) => void;
}

export const useSupplyChainStore = create<SupplyChainState>((set) => ({
  vessels: [],
  disruptions: [],
  routes: null,
  agentMessages: [],
  systemStatus: {
    apiHealth: 'Unknown',
    lastUpdated: new Date().toISOString(),
  },
  
  setVessels: (vessels) => set({ vessels }),
  setDisruptions: (disruptions) => set({ disruptions }),
  setRoutes: (routes) => set({ routes }),
  addAgentMessage: (message) => set((state) => ({ 
    agentMessages: [...state.agentMessages, message] 
  })),
  setSystemStatus: (status) => set({ systemStatus: status }),
}));
