export interface RouteData {
  origin: [number, number];
  destination: [number, number];
  risk_score?: number;
  route_id?: string;
  originLabel?: string;
  destLabel?: string;
}

export interface RiskNode {
  longitude: number;
  latitude: number;
  risk_score: number;
  id: string;
  label?: string;
}

export interface StockItem {
  sku_id: string;
  current_stock: number;
  recommended_stock: number;
  po_info?: { po_triggered: boolean; po_quantity: number };
}

export interface LogEntry {
  ts: string;
  id: string;
  msg: string;
  severity: 'nominal' | 'warning' | 'critical';
}
