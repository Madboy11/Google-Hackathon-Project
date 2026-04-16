⬡ NEXUS-SC — Dev A Task Sheet
Backend + AI/ML (Python / FastAPI)
> **Ownership:** `backend/` directory — `oracle/`, `navigator/`, `buffer/`  
> **Stack:** Python, FastAPI, PyTorch, Stable-Baselines3, Kafka, Redis, PostgreSQL
---
Day 0 — Project Setup (Before the Clock Starts)
Goals
Scaffold the entire Python monorepo structure.
Get Kafka, Redis, and PostgreSQL running locally via Docker Compose.
Agree on and lock the `shared/schema.json` and `shared/api-spec.yaml` with Dev B.
Tasks
```bash
# 1. Initialise repo and Python environment
git init nexus-sc
cd nexus-sc
python -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt

# 2. Start shared infrastructure
docker-compose up -d kafka redis postgres

# 3. Verify Kafka broker is reachable
kafka-topics.sh --list --bootstrap-server localhost:9092

# 4. Create Kafka topics
kafka-topics.sh --create --topic nexus.risk.scores --bootstrap-server localhost:9092
kafka-topics.sh --create --topic nexus.demand.signals --bootstrap-server localhost:9092
kafka-topics.sh --create --topic nexus.routing.orders --bootstrap-server localhost:9092
kafka-topics.sh --create --topic nexus.inventory.alerts --bootstrap-server localhost:9092
```
Deliverables
[ ] `backend/` folder structure created
[ ] Docker Compose running (Kafka, Redis, Postgres)
[ ] `shared/schema.json` agreed and committed
[ ] `shared/api-spec.yaml` skeleton committed (to be completed by Day 1 noon)
[ ] Branch `dev-a-backend` created and pushed
---
Day 1 AM — ORACLE Module (AI Predictive Engine)
Goal
Build and expose the risk scoring engine. This is the brain of NEXUS-SC — everything downstream depends on it.
Tasks
1. Prepare Synthetic Training Data
Load the GAN-generated synthetic dataset (AIS telemetry, demand logs, weather history).
Normalise and split into train/validation sets.
2. LSTM Model — Weather & Demand Patterns
```python
# backend/oracle/models/lstm_model.py
import torch
import torch.nn as nn

class DemandLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])
```
Train for demand forecasting and weather-correlated delay prediction.
Export model weights to `backend/oracle/weights/`.
3. Transformer Model — Geopolitical & Sentiment NLP
Use HuggingFace `distilbert-base-uncased` fine-tuned on GDELT event stream.
Output: disruption probability score per event per node.
4. Risk Score Aggregation
Ensemble LSTM output + Transformer output → weighted disruption score `[0.0 – 1.0]` per node.
Output per node: `{ node_id, risk_score, risk_type, time_horizon: "24h|72h|7d" }`
5. REST Endpoint
```python
# backend/oracle/main.py
@app.post("/risk-score")
async def get_risk_score(node_id: str, time_horizon: str = "72h"):
    score = oracle_engine.score(node_id, time_horizon)
    return {"node_id": node_id, "risk_score": score, "time_horizon": time_horizon}
```
6. Kafka Publisher
On each score computation, publish to `nexus.risk.scores`.
Deliverables by Day 1 Noon
[ ] LSTM model trained on synthetic data (≥70% validation accuracy)
[ ] `/risk-score` endpoint live and returning scores
[ ] Kafka publisher confirmed working (`nexus.risk.scores` topic)
[ ] `shared/api-spec.yaml` fully documented and pushed
---
Day 1 PM — NAVIGATOR Module (RL Routing Agent)
Goal
Build a reinforcement learning routing agent that reacts to ORACLE risk scores and reroutes freight autonomously.
Tasks
1. Environment Definition
```python
# backend/navigator/env/routing_env.py
import gym
import numpy as np

class RoutingEnv(gym.Env):
    """
    State:  vessel coords + port congestion + weather score + geopolitical risk
    Action: [0=maintain, 1=speed_up, 2=slow_down, 3=divert_port_A, 4=divert_port_B, 5=modal_switch]
    Reward: penalise late_delivery + carbon_emissions + demurrage_cost
    """
    def __init__(self, risk_feed):
        self.observation_space = gym.spaces.Box(low=0, high=1, shape=(12,), dtype=np.float32)
        self.action_space = gym.spaces.Discrete(6)
        self.risk_feed = risk_feed
```
2. RL Agent Training
```python
# backend/navigator/train.py
from stable_baselines3 import PPO
from navigator.env.routing_env import RoutingEnv

env = RoutingEnv(risk_feed=synthetic_feed)
model = PPO("MlpPolicy", env, verbose=1, learning_rate=3e-4, n_steps=2048)
model.learn(total_timesteps=100_000)
model.save("backend/navigator/weights/ppo_nexus")
```
3. Kafka Consumer (from ORACLE)
Subscribe to `nexus.risk.scores`.
On high-risk score (threshold: `> 0.7`), trigger RL agent re-evaluation.
4. Routing Decision Output
Publish routing orders to `nexus.routing.orders`:
```json
{
  "vessel_id": "IMO-9876543",
  "action": "divert_port_A",
  "cost_delta_usd": 12400,
  "delay_delta_hours": 18,
  "carbon_delta_tonnes": -2.1,
  "confidence": 0.87
}
```
5. REST Endpoint
```python
@app.get("/routing/current")
async def get_current_routing():
    return navigator_engine.get_active_routes()

@app.post("/routing/override")
async def override_routing(vessel_id: str, action: str):
    return navigator_engine.apply_override(vessel_id, action)
```
Deliverables by Day 1 EOD
[ ] RL agent trained (PPO) — outperforms heuristic baseline by >20% on synthetic data
[ ] Kafka consumer subscribed to `nexus.risk.scores`
[ ] `/routing/current` and `/routing/override` endpoints live
[ ] Routing orders published to `nexus.routing.orders`
---
Day 2 AM — BUFFER Module (Inventory Optimisation Engine)
Goal
Build the autonomous safety stock recalculation and purchase order engine.
Tasks
1. Safety Stock Neural Net
```python
# backend/buffer/models/safety_stock_model.py
# Replaces static: SS = Z * sqrt(E[L]*sigma_D^2 + E[D]^2*sigma_L^2)
# with a live, self-recalibrating neural network

class SafetyStockNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(8, 64), nn.ReLU(),
            nn.Linear(64, 32), nn.ReLU(),
            nn.Linear(32, 1)   # Output: recommended safety stock units
        )
    # Inputs: risk_score, E[L], sigma_L, E[D], sigma_D, lead_time_trend,
    #         supplier_risk, current_stock
```
2. PO Trigger Logic
```python
# backend/buffer/po_engine.py
def evaluate_and_trigger(sku_id: str, risk_score: float, current_stock: int):
    recommended_ss = model.predict(sku_id, risk_score)
    if current_stock < recommended_ss * THRESHOLD_MULTIPLIER:
        trigger_purchase_order(sku_id, qty=recommended_ss - current_stock)
```
3. Anti-Bullwhip: Real-Time POS Signal Sharing
Subscribe to `nexus.demand.signals` (live POS data feed).
Share upstream immediately — no batching, no delay.
4. REST Endpoints
```python
@app.get("/inventory/safety-stock")
async def get_safety_stock(sku_id: str):
    return buffer_engine.get_safety_stock(sku_id)

@app.post("/inventory/trigger-po")
async def trigger_po(sku_id: str, quantity: int):
    return buffer_engine.manual_trigger(sku_id, quantity)
```
Deliverables by Day 2 Noon
[ ] Safety stock model trained and producing live recalculations
[ ] Auto-PO trigger fires correctly on threshold breach
[ ] Kafka consumer on `nexus.demand.signals` live
[ ] Both inventory endpoints live and tested
---
Day 2 PM — Integration & Testing
Goal
Wire all three backend modules into a unified event-driven flow. Benchmark. Document.
Integration Checklist
```
ORACLE ──[nexus.risk.scores]──► NAVIGATOR ──[nexus.routing.orders]──► Frontend
   │
   └──[nexus.demand.signals]──► BUFFER ──[nexus.inventory.alerts]──► Frontend
```
Tasks
[ ] End-to-end smoke test: inject a mock Red Sea risk event → verify NAVIGATOR reroutes → verify BUFFER adjusts stock
[ ] Benchmark RL agent vs. static heuristic baseline (target: >20% improvement)
[ ] All `/health` endpoints returning 200
[ ] Confirm Dev B's frontend can reach all endpoints
[ ] Final merge: `dev-a-backend` → `main` after joint integration test
API Documentation
Ensure `shared/api-spec.yaml` is final and reflects all live endpoints.
Add example request/response JSON for each endpoint.
---
Success Metrics — Dev A
Metric	Target
RL agent vs. heuristic baseline	>20% improvement on synthetic dataset
Risk score latency	<500ms per node
Auto-PO trigger accuracy	Fires on 100% of threshold breaches in test suite
End-to-end Kafka flow	ORACLE → NAVIGATOR → BUFFER confirmed working
API uptime during demo	100% — no crashes during Red Sea scenario
---
⬡ NEXUS-SC | Dev A — Backend + AI/ML ⬡