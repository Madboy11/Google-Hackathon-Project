import logging
from .models.safety_stock_model import ss_net

logger = logging.getLogger(__name__)
THRESHOLD_MULTIPLIER = 1.1  # Reorder point threshold

def trigger_purchase_order(sku_id: str, qty: int):
    # In reality this would interact with an ERP or PO system
    logger.info(f"==> AUTOMATED PO TRIGGERED for {sku_id}: {qty} units")
    return {"sku_id": sku_id, "po_triggered": True, "po_quantity": qty}

def evaluate_and_trigger(sku_id: str, risk_score: float, current_stock: int):
    recommended_ss = ss_net.predict(sku_id, risk_score)
    logger.info(f"Evaluated {sku_id} - Current: {current_stock}, Recommended: {recommended_ss}")
    
    if current_stock < recommended_ss * THRESHOLD_MULTIPLIER:
        qty_needed = int(recommended_ss - current_stock)
        trigger_res = trigger_purchase_order(sku_id, qty=qty_needed)
        return trigger_res, recommended_ss
    return {"sku_id": sku_id, "po_triggered": False, "po_quantity": 0}, recommended_ss
