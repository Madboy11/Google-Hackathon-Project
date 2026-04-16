# ⬡ NEXUS-SC — Project Rules & Conventions

> **Read this before writing a single line of code. These rules exist to ensure zero merge conflicts, clean integration, and a demo-stable `main` branch at all times.**

---

## Repository Structure

```
nexus-sc/
├── backend/                  ← DEV A owns this entirely
│   ├── oracle/               ← LSTM, Transformer, risk scoring
│   ├── navigator/            ← RL agent, routing logic
│   ├── buffer/               ← Inventory engine, PO automation
│   └── shared/               ← Kafka topics, data models (schema only — no logic)
├── blockchain/               ← DEV B owns this entirely
│   └── ledger/               ← Hyperledger chaincode (Go)
├── fortress/                 ← DEV B owns this entirely
│   └── ...                   ← Zero-trust config, mTLS, anomaly detection
├── frontend/                 ← DEV B owns this entirely
│   └── src/
│       ├── components/       ← React UI components
│       └── api/              ← API client (consumes Dev A's endpoints)
├── docker-compose.yml        ← Shared infrastructure — neutral ground
├── shared/
│   ├── schema.json           ← Kafka message schema (agreed Day 0, sync before editing)
│   └── api-spec.yaml         ← REST API contract (Dev A publishes by Day 1 noon)
└── README.md
```

---

## Anti-Conflict Rules

### Rule 1 — Shared Schema Contract
On **Day 0**, both devs agree on the Kafka message schema and REST API contracts, written in `shared/schema.json`.  
**Neither dev changes this file without a 5-minute sync call first.**

### Rule 2 — Directory Ownership
| Developer | Owns | Never Touches |
|-----------|------|---------------|
| Dev A | `backend/` (oracle, navigator, buffer) | `frontend/`, `blockchain/`, `fortress/` |
| Dev B | `blockchain/`, `fortress/`, `frontend/` | `backend/oracle/`, `backend/navigator/`, `backend/buffer/` |

Violations cause merge conflicts and broken integrations. Respect boundaries strictly.

### Rule 3 — API-First Development
- Dev A's FastAPI endpoints must be documented in `shared/api-spec.yaml` by **Day 1, 12:00 noon**.
- Dev B builds the frontend against this spec using **mock data** until Dev A's server is live.
- No undocumented endpoints. If it's not in the spec, it doesn't exist yet.

### Rule 4 — docker-compose Is Neutral Ground
- Both devs can add services to `docker-compose.yml`.
- Protocol: **always `git pull` before editing this file**.
- Never force-push changes to this file.

### Rule 5 — Branch Strategy
| Branch | Purpose |
|--------|---------|
| `main` | Demo-stable only. Never push untested code here. |
| `dev-a-backend` | Dev A's working branch |
| `dev-b-frontend` | Dev B's working branch |

Merge to `main` only after a quick integration test confirmed by both devs.

### Rule 6 — Kafka Topics
Each module publishes to its own dedicated topic. Topics are defined in `shared/` only — **never hardcoded inside module code**.

| Topic | Publisher | Subscriber |
|-------|-----------|------------|
| `nexus.risk.scores` | ORACLE | NAVIGATOR |
| `nexus.demand.signals` | External/POS feed | BUFFER |
| `nexus.routing.orders` | NAVIGATOR | Frontend / Logs |
| `nexus.inventory.alerts` | BUFFER | Frontend / Ops |

---

## Git Workflow

```bash
# Start of each session
git pull origin main
git checkout dev-a-backend   # or dev-b-frontend

# Commit often with clear messages
git commit -m "feat(oracle): add LSTM weather model training loop"

# Before merging to main — integration test first
git checkout main
git pull
git merge dev-a-backend
# Run: docker-compose up && hit /health on all endpoints
git push origin main
```

**Commit message convention:** `type(scope): short description`  
Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`

---

## API Contract (shared/api-spec.yaml excerpt)

Dev A must define and publish these endpoints by Day 1 noon:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `POST` | `/risk-score` | Returns disruption risk score per node |
| `GET` | `/routing/current` | Current RL routing recommendations |
| `POST` | `/routing/override` | Manual human override for routing |
| `GET` | `/inventory/safety-stock` | Current safety stock levels per SKU |
| `POST` | `/inventory/trigger-po` | Manually trigger purchase order |

Dev B builds frontend mock responses against these shapes from Day 1 morning onwards.

---

## Environment Variables

All secrets managed via **HashiCorp Vault**. For local dev, use a `.env` file (never committed).

```env
# .env.example — copy to .env and fill in
KAFKA_BROKER=localhost:9092
REDIS_URL=redis://localhost:6379
POSTGRES_URL=postgresql://user:pass@localhost:5432/nexus
HYPERLEDGER_ENDPOINT=http://localhost:7051
JWT_SECRET=replace_me
AWS_REGION=us-east-1
```

`.env` is in `.gitignore`. Never commit secrets.

---

## Demo Scenario — Red Sea Closure

The final demo flow that must work by Day 2, 6:00 PM:

1. User clicks **"Inject Red Sea Closure"** button in the UI.
2. ORACLE detects the geopolitical risk signal and emits an elevated risk score to `nexus.risk.scores`.
3. NAVIGATOR receives the score, recalculates optimal routes, and emits rerouting orders.
4. BUFFER recalculates safety stock requirements and triggers autonomous POs.
5. LEDGER logs all events immutably on the Hyperledger test network.
6. Frontend map animates the rerouting in real-time with updated cost/delay metrics.

**This flow must be end-to-end functional. It is the centrepiece of the pitch.**

---

*⬡ NEXUS-SC | Neural EXtended Unified Supply-Chain System ⬡*
