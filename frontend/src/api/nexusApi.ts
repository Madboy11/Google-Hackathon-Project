import axios from 'axios';

const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

export const getRiskScore = async (nodeId: string, horizon = '72h') => {
  try {
    const res = await axios.get(`${BASE}/risk-score`, { params: { node_id: nodeId, time_horizon: horizon } });
    return res.data;
  } catch (error) {
    // Mock response for hackathon UI development
    return {
      node_id: nodeId,
      risk_score: nodeId === 'RED_SEA_CORRIDOR' ? 0.95 : 0.1,
      status: "mocked"
    };
  }
};

export const getCurrentRouting = async () => {
    try {
        const res = await axios.get(`${BASE}/routing/current`);
        return res.data;
    } catch {
        return [
            { origin: [30.04, 31.23], destination: [40.71, -74.00], risk_score: 0.1, route_id: "r1" }
        ];
    }
};

export const getSafetyStock = async (skuId: string) => {
    try {
        const res = await axios.get(`${BASE}/inventory/safety-stock`, { params: { sku_id: skuId } });
        return res.data;
    } catch {
        return {
            sku_id: skuId,
            safety_stock: 400,
            current_stock: 450
        };
    }
};

export const getLedgerProvenance = async (skuId: string) => {
  return axios.get(`${BASE}/ledger/provenance/${skuId}`);
};
