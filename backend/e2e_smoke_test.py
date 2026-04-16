import sys
import os

# Append the current directory so modules can be imported directly for simulation
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from oracle.engine import oracle_engine
from navigator.engine import navigator_engine
from buffer.engine import buffer_engine

def simulate_demo_flow():
    print("==================================================")
    print("  NEXUS-SC: Red Sea Closure Edge-to-Edge Simulation ")
    print("==================================================")
    
    print("\n[1] UI Trigger: Demo user clicks 'Inject Red Sea Closure'")
    # Simulate the FastAPI POST call to /risk-score
    print("--> POST /risk-score {'node_id': 'RED_SEA_CORRIDOR'}")
    
    # 1. ORACLE calculates risk
    risk_score = oracle_engine.score("RED_SEA_CORRIDOR", "72h")
    print(f"   [ORACLE API Response] Generated Disruption Risk Score: {risk_score:.3f}")
    
    # 2. Emits to Kafka (handled internally by oracle_engine in our mock)
    # 3. NAVIGATOR consumes and reroutes
    print("\n[2] RL Agent (NAVIGATOR) Subscribes to Risk Scores...")
    print("   [KAFKA: nexus.risk.scores] Node 'RED_SEA_CORRIDOR' breach threshold > 0.70")
    navigator_engine.process_risk_score("RED_SEA_CORRIDOR", risk_score)
    print("   [KAFKA: nexus.routing.orders] PPO RL Agent emitted optimum reroute instruction (Cost/Carbon optimized).")
    
    # 4. BUFFER monitors supply constraints
    print("\n[3] Autonomous PO Engine (BUFFER) Reassessing Stocks...")
    # Assume we check inventory for SKU-ABC
    print("--> GET /inventory/safety-stock?sku_id=SKU-ABC")
    res = buffer_engine.get_safety_stock("SKU-ABC")
    
    print(f"   [BUFFER] SKU: {res['sku_id']}")
    print(f"   [BUFFER] Current Stock: {res['current_stock']}")
    print(f"   [BUFFER] Newly Recommended Safety Stock: {res['recommended_stock']} (Adjusted dynamically for lead-time impact)")
    
    po_info = res['po_info']
    if po_info['po_triggered']:
        print(f"\n[4] SYSTEM ACTION: 🚨 Automated Purchase Order Triggered 🚨")
        print(f"   [BUFFER] Reordered {po_info['po_quantity']} units of {res['sku_id']} autonomously.")
    else:
        print("\n[4] SYSTEM ACTION: Stock is sufficient for adjusted risk.")
        
    print("==================================================")
    print("  [END OF SIMULATION] - Demo Ready for UI Hookup  ")
    print("==================================================")

if __name__ == "__main__":
    simulate_demo_flow()
