import random
import logging
import os
import pandas as pd
from .po_engine import evaluate_and_trigger

logger = logging.getLogger(__name__)

class BufferEngine:
    def __init__(self):
        self.simulation_mode = False
        self.disruption_map = self._load_disruptions()
        
    def set_simulation(self, active: bool):
        self.simulation_mode = active
    
    def _load_disruptions(self):
        try:
            file_path = os.path.join(os.path.dirname(__file__), '../../data/extracted/supply_chain_disruption_recovery.csv')
            df = pd.read_csv(file_path, nrows=5000)
            
            # Map average production impact percentage per industry
            impacts = df.groupby('industry')['production_impact_pct'].mean().to_dict()
            return impacts
        except Exception as e:
            logger.error(f"Fallback! Could not load Disruption CSV: {e}")
            return {"Pharmaceuticals": 25.0, "Electronics": 35.0}

    def get_safety_stock(self, sku_id: str):
        # Base stock is fixed, but recommended stock changes based on Kaggle impact
        curr = 100
        
        # Risk factor = impact percentage divided by 100
        impact = self.disruption_map.get(sku_id, 20.0)
        risk_score = impact / 100.0
        
        if self.simulation_mode:
            curr = 80
            risk_score = 0.95
            recommended = 150
            po_info = {"po_triggered": True, "po_quantity": 70}
        else:
            po_info, recommended = evaluate_and_trigger(sku_id, risk_score, curr)
            
        return {
            "sku_id": sku_id,
            "current_stock": curr,
            "recommended_stock": recommended,
            "po_info": po_info
        }

    def manual_trigger(self, sku_id: str, quantity: int):
        self.stocks[sku_id] = self.stocks.get(sku_id, 0) + quantity
        return {"status": "success", "message": f"Successfully triggered manual PO for {sku_id} x{quantity}"}

buffer_engine = BufferEngine()
