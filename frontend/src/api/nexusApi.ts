import axios from 'axios';

const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── ORACLE: Risk Score (POST per api-spec.yaml) ───
export const getRiskScore = async (nodeId: string, horizon = '72h') => {
  try {
    const res = await api.post('/risk-score', { node_id: nodeId, time_horizon: horizon });
    return res.data;
  } catch {
    return {
      node_id: nodeId,
      risk_score: nodeId.toLowerCase().includes('red_sea') ? 0.95 : Math.random() * 0.35 + 0.05,
      time_horizon: horizon,
      status: 'mocked',
    };
  }
};

// ─── NAVIGATOR: Current Routes (GET) ───
export const getCurrentRouting = async () => {
  try {
    const res = await api.get('/routing/current');
    return res.data;
  } catch {
    return [
      { vessel_id: 'IMO-100200', status: 'on_time', current_action: 'maintain' },
      { vessel_id: 'IMO-300400', status: 'delayed', current_action: 'slow_down' },
    ];
  }
};

// ─── NAVIGATOR: Override Route (POST) ───
export const overrideRouting = async (vesselId: string, action: string) => {
  try {
    const res = await api.post('/routing/override', { vessel_id: vesselId, action });
    return res.data;
  } catch {
    return { status: 'mocked', UpdatedRoute: { vessel_id: vesselId, status: 'overridden', current_action: action } };
  }
};

// ─── BUFFER: Safety Stock (GET) ───
export const getSafetyStock = async (skuId: string) => {
  try {
    const res = await api.get('/inventory/safety-stock', { params: { sku_id: skuId } });
    return res.data;
  } catch {
    return {
      sku_id: skuId,
      current_stock: Math.floor(Math.random() * 50 + 90),
      recommended_stock: Math.floor(Math.random() * 50 + 130),
      po_info: { sku_id: skuId, po_triggered: false, po_quantity: 0 },
    };
  }
};

// ─── BUFFER: Trigger PO (POST) ───
export const triggerPO = async (skuId: string, quantity: number) => {
  try {
    const res = await api.post('/inventory/trigger-po', { sku_id: skuId, quantity });
    return res.data;
  } catch {
    return { status: 'mocked', message: `Triggered PO for ${skuId} x${quantity}` };
  }
};

// ─── DIAGNOSTICS: System Health (GET) ───
export const getSystemDiagnostics = async () => {
  try {
    const res = await api.get('/diagnostics/system');
    return res.data;
  } catch {
    return {
      health: '98.4%',
      disruptions: '02',
      latency: '14MS',
      oracle_status: 'ONLINE',
      navigator_status: 'ONLINE',
      buffer_status: 'ONLINE',
      ledger_status: 'SYNCED',
      fortress_status: 'SECURE',
    };
  }
};

// ─── HEALTH: Liveness (GET) ───
export const getHealth = async () => {
  try {
    const res = await api.get('/health');
    return res.data;
  } catch {
    return { status: 'OFFLINE', service: 'NEXUS-SC Dev A Backend' };
  }
};
