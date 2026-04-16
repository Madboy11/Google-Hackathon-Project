# ⬡ NEXUS-SC
### Neural EXtended Unified Supply-Chain System

> *A self-healing, anti-fragile supply chain intelligence platform integrating AI, Blockchain, and Zero-Trust Cybersecurity to predict and autonomously mitigate global disruption events.*

## 🏆 Hackathon Project Highlights

The era of optimizing supply chains purely for efficiency is over. Recent events like the Red Sea closures, port congestion, and semiconductor shortages prove that efficiency without resilience is fragility.

**NEXUS-SC** does not just add another dashboard to an existing fragile system. We replace the reactive foundation of supply chains with an intelligent, self-predictive, and self-healing Loop.

### The 4 Pillars of NEXUS-SC:

1. **🔮 ORACLE (AI Predictive Engine)**
   - Uses PyTorch-based sequence modeling (LSTM) combined with Transformer NLP to constantly scan geopolitical, weather, and demand telemetry.
   - Outputs highly accurate _Disruption Risk Scores_ per node.
2. **🧭 NAVIGATOR (RL Routing Agent)**
   - Once ORACLE detects a risk threshold breach, NAVIGATOR uses Reinforcement Learning (PPO) to reroute maritime freight autonomously, balancing demurrage costs against carbon footprint and delays.
3. **📦 BUFFER (Inventory Optimization)**
   - Dynamically self-recalibrates safety stock thresholds and triggers automated Purchase Orders (POs) the moment risk-influenced lead-times shift, preventing the Bullwhip Effect.
4. **🛡️ FORTRESS & LEDGER (Zero-Trust & Blockchain)**
   - Every action from ORACLE, NAVIGATOR, and BUFFER is logged immutably onto a **Hyperledger Fabric** chaincode for absolute audit transparency.
   - The entire architecture is secured via **Istio mTLS** and Zero-Knowledge Proofs (ZKPs) for maintaining compliance without exposing sensitive tier-n supplier lists.

---

## 🛠 Project Architecture (Parallel Development)

To guarantee zero merge conflicts during the tight hackathon deadline, we split the architecture distinctly:

| Module | Developer | Tech Stack | Status |
|--------|-----------|------------|--------|
| **Backend & AI Engine** (`backend/`) | **Dev A (Vansh)** | Python, FastAPI, PyTorch, Gym, Kafka | ✅ Completed |
| **Blockchain & UI** (`frontend/`, `blockchain/`) | **Dev B (Henil)** | React 18, Deck.gl, Tailwind, Go, Fabric | ✅ Completed |
| **Shared Contracts** (`shared/`) | **Both** | JSON Schema, OpenAPI 3.0 | ✅ Locked |

---

## 🚀 How to Demo

Since NEXUS-SC heavily leverages decoupled architectures, you can demo the intelligence either via the Frontend Interface or natively through the Backend AI simulation.

### 1. Frontend Operations UI Dashboard (Dev B Side)
We have a highly polished, interactive UI running `Deck.gl` and `Recharts` connected to mock backend states.
- Open your terminal and run:
  ```bash
  cd frontend
  npm start
  ```
- Head to `http://localhost:3000`. 
- **The Red Sea Scenario:** Look for the red "Inject Red Sea Closure Event" button. Clicking this triggers the ORACLE score spike, visually animates the NAVIGATOR's rerouting from the Suez canal to the Cape of Good Hope, and alters the BUFFER dashboard.

### 2. Backend Native AI E2E Simulation (Dev A Side)
We created a fully simulated command-line output showing exactly what the AI layers observe over the Kafka streams. 
- You can preview this simulated backend operation inside the `demo.md` or `backend-demo-output.md` artifacts in your system.
- Or, with a working Python 3.11+ environment, run:
  ```bash
  python backend/e2e_smoke_test.py
  python backend/navigator/benchmark_rl.py
  ```

---
*Built with ❤️ for the Google Hackathon.*
