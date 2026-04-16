import random
import logging
from .po_engine import evaluate_and_trigger

logger = logging.getLogger(__name__)

class BufferEngine:
    def __init__(self):
        # Mock database of current stocks and risk factors
        self.stocks = {
            "SKU-ABC": 110,
            "SKU-XYZ": 85
        }
    
    def get_safety_stock(self, sku_id: str):
        # Get stock, fallback to 100 if unknown
        curr = self.stocks.get(sku_id, 100)
        # Mock risk factor
        risk_score = random.uniform(0.1, 0.4)
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
