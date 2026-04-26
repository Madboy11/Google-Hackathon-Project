import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

export type RouteStatus = 'active' | 'rerouting' | 'completed' | 'cancelled' | 'at_risk';

export interface ActiveRoute {
  id: string;                                   // unique route id
  origin: string;                               // human label e.g. "Port of Shanghai"
  destination: string;
  originCoords: [number, number];               // [lon, lat]
  destCoords: [number, number];
  cargo: string;
  carrier: string;
  departureDate: string;
  waypoints: [number, number][];                // full path from OSRM
  riskScore: number;                            // 0-1
  estimatedDays: number;
  costUSD: number;
  status: RouteStatus;
  mode?: 'sea' | 'land' | 'air';                // transport mode
  createdAt: string;
  updatedAt: string;
  // Oracle auto-reroute tracking
  autoRerouted: boolean;
  previousRiskScore?: number;
  reroutableBy: 'oracle' | 'manual';
}

export type LedgerTxType =
  | 'ROUTE_CREATED'
  | 'ROUTE_UPDATED'
  | 'ROUTE_REROUTED'
  | 'ROUTE_CANCELLED'
  | 'INVENTORY_ADDED'
  | 'INVENTORY_UPDATED'
  | 'THREAT_ESCALATED'
  | 'THREAT_ADDED'
  | 'THREAT_RESOLVED'
  | 'ORACLE_ALERT';

export type ThreatType = 'Geopolitical' | 'Piracy' | 'Sanctions' | 'Cyber' | 'Weather' | 'Labor';
export type ThreatStatus = 'Active' | 'Monitoring' | 'Resolved';

export interface ThreatVector {
  id: string;
  corridor: string;
  region: string;
  type: ThreatType;
  severity: number;      // 0-1
  confidence: number;    // 0-1
  status: ThreatStatus;
  description: string;
  affectedRoutes: string[];    // route IDs or labels
  affectedCorridors: string[];
  createdAt: string;
  updatedAt: string;
  source: 'oracle' | 'manual' | 'mcp';
  escalatedToLedger: boolean;
}

export interface LedgerEntry {
  txHash: string;          // simulated blockchain hash
  blockHeight: number;
  type: LedgerTxType;
  summary: string;
  payload: Record<string, unknown>;
  initiatedBy: 'oracle' | 'navigator' | 'buffer' | 'fortress' | 'manual';
  timestamp: string;
  confirmedAt?: string;    // when "mined"
  status: 'pending' | 'confirmed';
}

export interface InventoryItem {
  id: string;
  product: string;
  sku: string;
  category: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  maxCapacity: number;
  leadTimeDays: number;
  consumptionRate: number;
  location: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  createdAt: string;
  updatedAt: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────────────────────────────────────

interface SupplyChainState {
  // core
  vessels: Vessel[];
  disruptions: Disruption[];
  systemStatus: SystemStatus;
  agentMessages: AgentMessage[];

  // navigator
  routes: ActiveRoute[];

  // ledger / blockchain
  ledgerEntries: LedgerEntry[];
  blockHeight: number;

  // buffer / inventory
  inventory: InventoryItem[];

  // fortress / threats
  threats: ThreatVector[];

  // ── actions ─────────────────────────────────────────────────────────────
  setVessels: (v: Vessel[]) => void;
  setDisruptions: (d: Disruption[]) => void;
  setSystemStatus: (s: SystemStatus) => void;
  addAgentMessage: (m: AgentMessage) => void;

  // threats
  setThreats: (t: ThreatVector[]) => void;
  addThreat: (t: Omit<ThreatVector, 'id' | 'createdAt' | 'updatedAt' | 'escalatedToLedger'>) => void;
  updateThreat: (id: string, patch: Partial<ThreatVector>) => void;
  removeThreat: (id: string) => void;

  // routes
  addRoute: (r: ActiveRoute) => void;
  updateRoute: (id: string, patch: Partial<ActiveRoute>) => void;
  removeRoute: (id: string) => void;

  // ledger
  addLedgerEntry: (entry: Omit<LedgerEntry, 'txHash' | 'blockHeight' | 'status' | 'confirmedAt'>) => void;

  // inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string) => void;

  // legacy compat (used by AgentPanel + SupplyChainMap)
  setRoutes: (r: any) => void;
  routes_legacy: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeTxHash(): string {
  return '0x' + Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('').toUpperCase();
}

function broadcastSync(action: string, payload: any) {
  // @ts-ignore
  const ws = window.__ws;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'SYNC_ACTION', action, payload }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed inventory
// ─────────────────────────────────────────────────────────────────────────────

const SEED_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', product: 'Semiconductor Chips (A12)', sku: 'SC-A12-001', category: 'Electronics', currentStock: 1240, safetyStock: 2000, reorderPoint: 2500, maxCapacity: 8000, leadTimeDays: 45, consumptionRate: 65, location: 'Warehouse SG-01', unit: 'units', trend: 'down', createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'inv-2', product: 'Lithium Battery Cells', sku: 'LB-18650-B', category: 'Energy', currentStock: 5800, safetyStock: 3000, reorderPoint: 3500, maxCapacity: 12000, leadTimeDays: 21, consumptionRate: 120, location: 'Warehouse CN-04', unit: 'cells', trend: 'stable', createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'inv-3', product: 'Optical Fibre Cables', sku: 'OFC-SM-001', category: 'Networking', currentStock: 340, safetyStock: 500, reorderPoint: 800, maxCapacity: 3000, leadTimeDays: 14, consumptionRate: 22, location: 'Warehouse DE-02', unit: 'km', trend: 'down', createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'inv-4', product: 'Electric Motors (3kW)', sku: 'EM-3KW-200', category: 'Industrial', currentStock: 2100, safetyStock: 800, reorderPoint: 1000, maxCapacity: 4000, leadTimeDays: 30, consumptionRate: 18, location: 'Warehouse US-07', unit: 'units', trend: 'up', createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'inv-5', product: 'API Pharmaceutical Grade', sku: 'PH-API-VX1', category: 'Pharma', currentStock: 900, safetyStock: 1500, reorderPoint: 2000, maxCapacity: 6000, leadTimeDays: 60, consumptionRate: 40, location: 'Warehouse IN-03', unit: 'kg', trend: 'down', createdAt: new Date(Date.now() - 8 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
];

const SEED_THREATS: ThreatVector[] = [
  { id: 'th-1', corridor: 'Red Sea / Bab-el-Mandeb', region: 'Middle East', type: 'Geopolitical', severity: 0.91, confidence: 0.87, status: 'Active', description: 'Houthi missile and drone activity near Bab-el-Mandeb. Multiple vessels diverted via Cape of Good Hope. Insurance premiums elevated +40%.', affectedRoutes: ['EU–Asia', 'India–Europe'], affectedCorridors: ['Suez Canal', 'Red Sea'], createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 900000).toISOString(), source: 'mcp', escalatedToLedger: true },
  { id: 'th-2', corridor: 'Strait of Hormuz', region: 'Middle East', type: 'Geopolitical', severity: 0.74, confidence: 0.80, status: 'Active', description: 'Iranian naval exercises causing transit delays. Tanker risk premium elevated +35%. AIS transponder anomalies detected on 3 vessels.', affectedRoutes: ['Gulf Oil–Asia', 'LNG Exports'], affectedCorridors: ['Persian Gulf'], createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 2700000).toISOString(), source: 'mcp', escalatedToLedger: true },
  { id: 'th-3', corridor: 'South China Sea', region: 'Asia-Pacific', type: 'Geopolitical', severity: 0.68, confidence: 0.75, status: 'Monitoring', description: 'Territorial disputes near Spratly Islands escalating. AIS dark zones detected in 3 grid sectors. Naval shadow vessels reported.', affectedRoutes: ['China–SE Asia', 'Pacific Lanes'], affectedCorridors: ['South China Sea', 'Luzon Strait'], createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 7200000).toISOString(), source: 'mcp', escalatedToLedger: false },
  { id: 'th-4', corridor: 'Gulf of Guinea', region: 'West Africa', type: 'Piracy', severity: 0.65, confidence: 0.90, status: 'Active', description: '3 crew-kidnapping incidents in Q4. IMB advisory: transit in convoy with armed escort. Hotspot coordinates: 3°N 5°E.', affectedRoutes: ['West Africa–EU', 'Oil Exports'], affectedCorridors: ['Gulf of Guinea'], createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 10800000).toISOString(), source: 'mcp', escalatedToLedger: true },
  { id: 'th-5', corridor: 'Black Sea', region: 'Eastern Europe', type: 'Sanctions', severity: 0.82, confidence: 0.95, status: 'Active', description: 'New EU/OFAC sanctions on Russian-flag vessels. Grain corridor partially blocked. Void clauses on war risk insurance active for 8 flag states.', affectedRoutes: ['Grain Exports', 'Novorossiysk lanes'], affectedCorridors: ['Black Sea', 'Turkish Straits'], createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 1800000).toISOString(), source: 'mcp', escalatedToLedger: true },
  { id: 'th-6', corridor: 'Panama Canal', region: 'Central America', type: 'Weather', severity: 0.44, confidence: 0.82, status: 'Monitoring', description: 'El Niño drought reducing Gatun Lake levels. Draft restrictions active: max 44ft. Average queue 18 vessels, +6 days delay.', affectedRoutes: ['US–Asia', 'Containerised Cargo'], affectedCorridors: ['Panama Canal'], createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 21600000).toISOString(), source: 'mcp', escalatedToLedger: false },
  { id: 'th-7', corridor: 'Global Shipping IT', region: 'Global', type: 'Cyber', severity: 0.55, confidence: 0.65, status: 'Monitoring', description: 'RansomOps group "SaltTyphoon" targeting port logistics & AIS relay software. 2 incidents in SE Asia. CISA advisory issued.', affectedRoutes: ['All Digital Systems'], affectedCorridors: ['Global'], createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 14400000).toISOString(), source: 'oracle', escalatedToLedger: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useSupplyChainStore = create<SupplyChainState>()(
  persist(
    (set, get) => ({
      vessels: [],
      disruptions: [],
      routes: [],
      threats: SEED_THREATS,
      ledgerEntries: [],
      blockHeight: 1000,
      inventory: SEED_INVENTORY,
      agentMessages: [],
      routes_legacy: null,
      systemStatus: { apiHealth: 'Unknown', lastUpdated: new Date().toISOString() },

      setVessels: (vessels) => set({ vessels }),
      setDisruptions: (disruptions) => set({ disruptions }),
      setSystemStatus: (systemStatus) => set({ systemStatus }),
      addAgentMessage: (message) =>
        set((state) => ({ agentMessages: [...state.agentMessages, message] })),

      // ── routes ──
      addRoute: (route) =>
        set((state) => {
          broadcastSync('addRoute', route);
          return { routes: [...state.routes, route] };
        }),
      updateRoute: (id, patch) =>
        set((state) => {
          broadcastSync('updateRoute', { id, patch });
          return {
            routes: state.routes.map((r) =>
              r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
            ),
          };
        }),
      removeRoute: (id) =>
        set((state) => {
          broadcastSync('removeRoute', id);
          return { routes: state.routes.filter((r) => r.id !== id) };
        }),

      // ── threats ──
      setThreats: (threats) => set({ threats }),
      addThreat: (threat) => {
        const id = `th-${Date.now()}`;
        const now = new Date().toISOString();
        set((state) => ({
          threats: [{ ...threat, id, createdAt: now, updatedAt: now, escalatedToLedger: false }, ...state.threats],
        }));
      },
      updateThreat: (id, patch) =>
        set((state) => ({
          threats: state.threats.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
          ),
        })),
      removeThreat: (id) =>
        set((state) => ({ threats: state.threats.filter((t) => t.id !== id) })),

      // ── ledger ──
      addLedgerEntry: (entry) => {
        const { blockHeight } = get();
        const newHeight = blockHeight + 1;
        const txHash = makeTxHash();
        const now = new Date().toISOString();
        const newEntry: LedgerEntry = {
          ...entry,
          txHash,
          blockHeight: newHeight,
          status: 'pending',
        };
        // Simulate mining after 2s
        setTimeout(() => {
          set((state) => ({
            ledgerEntries: state.ledgerEntries.map((e) =>
              e.txHash === txHash
                ? { ...e, status: 'confirmed', confirmedAt: new Date().toISOString() }
                : e
            ),
          }));
        }, 2000);

        set((state) => {
          broadcastSync('addLedgerEntry', newEntry);
          return {
            ledgerEntries: [newEntry, ...state.ledgerEntries],
            blockHeight: newHeight,
          };
        });
      },

      // ── inventory ──
      addInventoryItem: (item) => {
        const id = `inv-${Date.now()}`;
        const now = new Date().toISOString();
        set((state) => ({
          inventory: [
            ...state.inventory,
            { ...item, id, createdAt: now, updatedAt: now },
          ],
        }));
      },
      updateInventoryItem: (id, patch) =>
        set((state) => ({
          inventory: state.inventory.map((item) =>
            item.id === id
              ? { ...item, ...patch, updatedAt: new Date().toISOString() }
              : item
          ),
        })),
      removeInventoryItem: (id) =>
        set((state) => ({
          inventory: state.inventory.filter((item) => item.id !== id),
        })),

      // legacy compat
      setRoutes: (r) => set({ routes_legacy: r }),
    }),
    {
      name: 'nexus-sc-store',
      partialize: (state) => ({
        routes: state.routes,
        ledgerEntries: state.ledgerEntries,
        blockHeight: state.blockHeight,
        inventory: state.inventory,
      }),
    }
  )
);
