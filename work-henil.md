⬡ NEXUS-SC — Dev B Task Sheet
Blockchain + Security + Frontend (Go / React)
> **Ownership:** `blockchain/`, `fortress/`, `frontend/` directories  
> **Stack:** Go (Hyperledger Fabric chaincode), React 18 + TypeScript, Tailwind CSS, D3.js, Deck.gl, Recharts
---
Day 0 — Project Setup (Before the Clock Starts)
Goals
Scaffold the React + TypeScript frontend project.
Stand up a local Hyperledger Fabric test network.
Configure base mTLS / FORTRESS skeleton.
Agree on and lock `shared/schema.json` and `shared/api-spec.yaml` with Dev A.
Tasks
```bash
# 1. Initialise React + TypeScript project
npx create-react-app frontend --template typescript
cd frontend
npm install tailwindcss d3 @deck.gl/react @deck.gl/layers recharts axios

# 2. Initialise Tailwind
npx tailwindcss init

# 3. Stand up Hyperledger Fabric test network (fabric-samples)
cd blockchain/ledger
./network.sh up createChannel -c nexus-channel -ca

# 4. Verify peer and orderer are running
docker ps | grep hyperledger
```
Deliverables
[ ] React app runs on `localhost:3000`
[ ] Hyperledger Fabric test network running locally
[ ] FORTRESS base directory scaffolded
[ ] `shared/schema.json` agreed and committed with Dev A
[ ] Branch `dev-b-frontend` created and pushed
---
Day 1 AM — LEDGER Module (Blockchain Transparency Layer)
Goal
Write and deploy Go chaincode that immutably logs every supply chain event on Hyperledger Fabric. Implement ZKP stub for compliance verification.
Tasks
1. Go Chaincode — Event Logging
```go
// blockchain/ledger/chaincode/nexus_ledger.go
package main

import (
    "encoding/json"
    "fmt"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SupplyEvent struct {
    EventID     string `json:"event_id"`
    NodeID      string `json:"node_id"`
    EventType   string `json:"event_type"`   // "risk_score" | "reroute" | "po_triggered" | "compliance_check"
    Payload     string `json:"payload"`       // JSON string of event data
    Timestamp   string `json:"timestamp"`
    TierLevel   int    `json:"tier_level"`    // 1–4
    ZKPProof    string `json:"zkp_proof"`     // compliance proof hash
}

func (s *SmartContract) LogEvent(ctx contractapi.TransactionContextInterface, eventJSON string) error {
    var event SupplyEvent
    json.Unmarshal([]byte(eventJSON), &event)
    return ctx.GetStub().PutState(event.EventID, []byte(eventJSON))
}

func (s *SmartContract) QueryEvent(ctx contractapi.TransactionContextInterface, eventID string) (*SupplyEvent, error) {
    data, err := ctx.GetStub().GetState(eventID)
    if err != nil || data == nil {
        return nil, fmt.Errorf("event %s not found", eventID)
    }
    var event SupplyEvent
    json.Unmarshal(data, &event)
    return &event, nil
}
```
2. Zero-Knowledge Proof Stub
```go
// ZKP: Tier-4 supplier proves compliance without revealing identity or buyer list
func (s *SmartContract) VerifyCompliance(ctx contractapi.TransactionContextInterface,
    supplierHash string, complianceType string) (bool, error) {
    // Stub: In production, integrate libsnark ZKP verification
    // For demo: verify hash against pre-committed compliance hashes
    storedHash, _ := ctx.GetStub().GetState("compliance:" + supplierHash)
    return string(storedHash) == complianceType, nil
}
```
3. Deploy Chaincode
```bash
cd blockchain/ledger
./network.sh deployCC -ccn nexus-ledger -ccp ./chaincode -ccl go
```
4. REST Wrapper (Go HTTP server or FastAPI proxy)
```
POST /ledger/log        → LogEvent
GET  /ledger/query/:id  → QueryEvent
POST /ledger/verify-compliance → VerifyCompliance
GET  /ledger/provenance/:sku_id → full audit trail for a SKU
```
Deliverables by Day 1 Noon
[ ] Chaincode deployed on Hyperledger test network
[ ] `LogEvent` and `QueryEvent` functions working
[ ] ZKP stub implemented (verify compliance without data exposure)
[ ] REST endpoints live and returning correct responses
---
Day 1 PM — FORTRESS Module (Zero-Trust Cybersecurity)
Goal
Configure mTLS between all Docker services, add JWT auth to all API routes, and implement basic anomaly detection.
Tasks
1. mTLS with Istio (Docker-based config)
```yaml
# fortress/istio/peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: nexus-mtls
  namespace: nexus-sc
spec:
  mtls:
    mode: STRICT   # All inter-service calls must be mutually authenticated
```
```bash
# Apply to local Docker Compose setup via Istio sidecar injection
istioctl install --set profile=demo -y
kubectl apply -f fortress/istio/peer-authentication.yaml
```
2. JWT Auth Middleware
```typescript
// fortress/middleware/auth.ts (applied to all API routes consumed by frontend)
const verifyJWT = (token: string): boolean => {
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return true;
  } catch {
    return false;
  }
};
```
Apply this middleware to every API call from `frontend/src/api/`.
3. Anomaly Detection on Request Patterns
```python
# fortress/anomaly_detector.py
# Simple isolation forest on API request frequency and payload size
from sklearn.ensemble import IsolationForest

detector = IsolationForest(contamination=0.05)
# Train on normal request pattern baseline
# Flag anomalies → log to nexus.security.alerts Kafka topic
```
4. Security Middleware Headers
```typescript
// Add to all API responses
res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
res.setHeader("X-Content-Type-Options", "nosniff");
res.setHeader("X-Frame-Options", "DENY");
res.setHeader("Content-Security-Policy", "default-src 'self'");
```
Deliverables by Day 1 EOD
[ ] mTLS configured between all Docker services (verify: service calls fail without certs)
[ ] JWT auth applied to all frontend API routes
[ ] Anomaly detection baseline trained and logging alerts
[ ] Security middleware headers on all responses
---
Day 2 AM — Frontend Dashboard
Goal
Build the full React dashboard: 3D global map, risk heat map, inventory dashboard — all connected to Dev A's backend.
Tasks
1. 3D Global Logistics Map (Deck.gl)
```tsx
// frontend/src/components/GlobalMap.tsx
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';

export const GlobalMap = ({ routes, riskNodes }) => (
  <DeckGL
    initialViewState={{ longitude: 20, latitude: 20, zoom: 2, pitch: 45 }}
    controller={true}
    layers={[
      new ScatterplotLayer({
        id: 'risk-nodes',
        data: riskNodes,
        getPosition: d => [d.longitude, d.latitude],
        getColor: d => riskToColor(d.risk_score),  // red=high risk, green=safe
        getRadius: d => d.risk_score * 50000,
      }),
      new ArcLayer({
        id: 'freight-routes',
        data: routes,
        getSourcePosition: d => d.origin,
        getTargetPosition: d => d.destination,
        getSourceColor: [0, 200, 255],
        getTargetColor: [255, 100, 0],
        getWidth: 2,
      }),
    ]}
  />
);
```
2. Risk Heat Map Overlay (D3.js)
```tsx
// frontend/src/components/RiskHeatMap.tsx
// D3-based choropleth overlay showing disruption risk per supply node
// Color scale: green (0.0) → yellow (0.5) → red (1.0)
// Updates every 30s via polling Dev A's /risk-score endpoint
```
3. Inventory Dashboard (Recharts)
```tsx
// frontend/src/components/InventoryDashboard.tsx
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const InventoryDashboard = ({ stockData, demandData }) => (
  <div className="grid grid-cols-2 gap-4 p-4">
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={stockData}>
        <Line type="monotone" dataKey="safety_stock" stroke="#00c8ff" />
        <Line type="monotone" dataKey="current_stock" stroke="#ff6400" />
        <XAxis dataKey="sku_id" />
        <YAxis />
        <Tooltip />
      </LineChart>
    </ResponsiveContainer>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={demandData}>
        <Bar dataKey="demand_variance" fill="#a855f7" />
        <XAxis dataKey="node" />
        <YAxis />
        <Tooltip />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
```
4. API Client (against shared/api-spec.yaml)
```typescript
// frontend/src/api/nexusApi.ts
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const getRiskScore = (nodeId: string, horizon = '72h') =>
  axios.get(`${BASE}/risk-score`, { params: { node_id: nodeId, time_horizon: horizon } });

export const getCurrentRouting = () =>
  axios.get(`${BASE}/routing/current`);

export const getSafetyStock = (skuId: string) =>
  axios.get(`${BASE}/inventory/safety-stock`, { params: { sku_id: skuId } });

export const getLedgerProvenance = (skuId: string) =>
  axios.get(`${BASE}/ledger/provenance/${skuId}`);
```
Use mock data until Dev A's server is confirmed live.
Deliverables by Day 2 Noon
[ ] 3D global map rendering with risk node overlays
[ ] Risk heat map updating every 30 seconds
[ ] Inventory dashboard showing safety stock vs. current stock
[ ] All API calls wired to Dev A's endpoints (or mock fallback)
---
Day 2 PM — Demo Scenario + Pitch Polish
Goal
Wire the "Red Sea Closure" demo trigger button, polish the UI, build pitch slides, rehearse.
Tasks
1. Demo Trigger Button
```tsx
// frontend/src/components/DemoControls.tsx
const injectRedSeaClosure = async () => {
  setDemoState('injecting');
  await axios.post(`${BASE}/risk-score`, {
    node_id: 'RED_SEA_CORRIDOR',
    override_score: 0.95,
    event_type: 'geopolitical_closure'
  });
  setDemoState('rerouting');
  // Map animates rerouting as NAVIGATOR responds
};

<button
  onClick={injectRedSeaClosure}
  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
>
  🔴 Inject Red Sea Closure Event
</button>
```
2. Animated Rerouting
When the demo event fires, the ArcLayer on the 3D map should animate freight routes shifting from Red Sea to Cape of Good Hope route.
Show real-time cost delta and delay delta in a pop-up overlay.
3. UI Polish Checklist
[ ] Dark theme (Tailwind `dark:` classes) — ops dashboards are dark by convention
[ ] Responsive layout for demo laptop screen
[ ] Loading states on all data-fetching components
[ ] Error boundaries on all API calls (demo must not crash)
[ ] NEXUS-SC logo and branding in header
4. Final Integration Test with Dev A
[ ] All API endpoints reachable from the frontend
[ ] End-to-end demo flow works: inject → reroute → inventory update → ledger log
[ ] Merge `dev-b-frontend` → `main` after joint confirmation
---
Success Metrics — Dev B
Metric	Target
Chaincode deployment	Successful on Hyperledger test network
ZKP compliance verification	Returns correct result for test hashes
mTLS enforcement	Unencrypted inter-service call fails
3D map render performance	>30fps on demo laptop
Demo button → rerouting animation	<3 seconds end-to-end
UI uptime during demo	100% — no crashes
---
⬡ NEXUS-SC | Dev B — Blockchain + Security + Frontend ⬡⬡ NEXUS-SC — Dev B Task Sheet
Blockchain + Security + Frontend (Go / React)
> **Ownership:** `blockchain/`, `fortress/`, `frontend/` directories  
> **Stack:** Go (Hyperledger Fabric chaincode), React 18 + TypeScript, Tailwind CSS, D3.js, Deck.gl, Recharts
---
Day 0 — Project Setup (Before the Clock Starts)
Goals
Scaffold the React + TypeScript frontend project.
Stand up a local Hyperledger Fabric test network.
Configure base mTLS / FORTRESS skeleton.
Agree on and lock `shared/schema.json` and `shared/api-spec.yaml` with Dev A.
Tasks
```bash
# 1. Initialise React + TypeScript project
npx create-react-app frontend --template typescript
cd frontend
npm install tailwindcss d3 @deck.gl/react @deck.gl/layers recharts axios

# 2. Initialise Tailwind
npx tailwindcss init

# 3. Stand up Hyperledger Fabric test network (fabric-samples)
cd blockchain/ledger
./network.sh up createChannel -c nexus-channel -ca

# 4. Verify peer and orderer are running
docker ps | grep hyperledger
```
Deliverables
[ ] React app runs on `localhost:3000`
[ ] Hyperledger Fabric test network running locally
[ ] FORTRESS base directory scaffolded
[ ] `shared/schema.json` agreed and committed with Dev A
[ ] Branch `dev-b-frontend` created and pushed
---
Day 1 AM — LEDGER Module (Blockchain Transparency Layer)
Goal
Write and deploy Go chaincode that immutably logs every supply chain event on Hyperledger Fabric. Implement ZKP stub for compliance verification.
Tasks
1. Go Chaincode — Event Logging
```go
// blockchain/ledger/chaincode/nexus_ledger.go
package main

import (
    "encoding/json"
    "fmt"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SupplyEvent struct {
    EventID     string `json:"event_id"`
    NodeID      string `json:"node_id"`
    EventType   string `json:"event_type"`   // "risk_score" | "reroute" | "po_triggered" | "compliance_check"
    Payload     string `json:"payload"`       // JSON string of event data
    Timestamp   string `json:"timestamp"`
    TierLevel   int    `json:"tier_level"`    // 1–4
    ZKPProof    string `json:"zkp_proof"`     // compliance proof hash
}

func (s *SmartContract) LogEvent(ctx contractapi.TransactionContextInterface, eventJSON string) error {
    var event SupplyEvent
    json.Unmarshal([]byte(eventJSON), &event)
    return ctx.GetStub().PutState(event.EventID, []byte(eventJSON))
}

func (s *SmartContract) QueryEvent(ctx contractapi.TransactionContextInterface, eventID string) (*SupplyEvent, error) {
    data, err := ctx.GetStub().GetState(eventID)
    if err != nil || data == nil {
        return nil, fmt.Errorf("event %s not found", eventID)
    }
    var event SupplyEvent
    json.Unmarshal(data, &event)
    return &event, nil
}
```
2. Zero-Knowledge Proof Stub
```go
// ZKP: Tier-4 supplier proves compliance without revealing identity or buyer list
func (s *SmartContract) VerifyCompliance(ctx contractapi.TransactionContextInterface,
    supplierHash string, complianceType string) (bool, error) {
    // Stub: In production, integrate libsnark ZKP verification
    // For demo: verify hash against pre-committed compliance hashes
    storedHash, _ := ctx.GetStub().GetState("compliance:" + supplierHash)
    return string(storedHash) == complianceType, nil
}
```
3. Deploy Chaincode
```bash
cd blockchain/ledger
./network.sh deployCC -ccn nexus-ledger -ccp ./chaincode -ccl go
```
4. REST Wrapper (Go HTTP server or FastAPI proxy)
```
POST /ledger/log        → LogEvent
GET  /ledger/query/:id  → QueryEvent
POST /ledger/verify-compliance → VerifyCompliance
GET  /ledger/provenance/:sku_id → full audit trail for a SKU
```
Deliverables by Day 1 Noon
[ ] Chaincode deployed on Hyperledger test network
[ ] `LogEvent` and `QueryEvent` functions working
[ ] ZKP stub implemented (verify compliance without data exposure)
[ ] REST endpoints live and returning correct responses
---
Day 1 PM — FORTRESS Module (Zero-Trust Cybersecurity)
Goal
Configure mTLS between all Docker services, add JWT auth to all API routes, and implement basic anomaly detection.
Tasks
1. mTLS with Istio (Docker-based config)
```yaml
# fortress/istio/peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: nexus-mtls
  namespace: nexus-sc
spec:
  mtls:
    mode: STRICT   # All inter-service calls must be mutually authenticated
```
```bash
# Apply to local Docker Compose setup via Istio sidecar injection
istioctl install --set profile=demo -y
kubectl apply -f fortress/istio/peer-authentication.yaml
```
2. JWT Auth Middleware
```typescript
// fortress/middleware/auth.ts (applied to all API routes consumed by frontend)
const verifyJWT = (token: string): boolean => {
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return true;
  } catch {
    return false;
  }
};
```
Apply this middleware to every API call from `frontend/src/api/`.
3. Anomaly Detection on Request Patterns
```python
# fortress/anomaly_detector.py
# Simple isolation forest on API request frequency and payload size
from sklearn.ensemble import IsolationForest

detector = IsolationForest(contamination=0.05)
# Train on normal request pattern baseline
# Flag anomalies → log to nexus.security.alerts Kafka topic
```
4. Security Middleware Headers
```typescript
// Add to all API responses
res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
res.setHeader("X-Content-Type-Options", "nosniff");
res.setHeader("X-Frame-Options", "DENY");
res.setHeader("Content-Security-Policy", "default-src 'self'");
```
Deliverables by Day 1 EOD
[ ] mTLS configured between all Docker services (verify: service calls fail without certs)
[ ] JWT auth applied to all frontend API routes
[ ] Anomaly detection baseline trained and logging alerts
[ ] Security middleware headers on all responses
---
Day 2 AM — Frontend Dashboard
Goal
Build the full React dashboard: 3D global map, risk heat map, inventory dashboard — all connected to Dev A's backend.
Tasks
1. 3D Global Logistics Map (Deck.gl)
```tsx
// frontend/src/components/GlobalMap.tsx
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';

export const GlobalMap = ({ routes, riskNodes }) => (
  <DeckGL
    initialViewState={{ longitude: 20, latitude: 20, zoom: 2, pitch: 45 }}
    controller={true}
    layers={[
      new ScatterplotLayer({
        id: 'risk-nodes',
        data: riskNodes,
        getPosition: d => [d.longitude, d.latitude],
        getColor: d => riskToColor(d.risk_score),  // red=high risk, green=safe
        getRadius: d => d.risk_score * 50000,
      }),
      new ArcLayer({
        id: 'freight-routes',
        data: routes,
        getSourcePosition: d => d.origin,
        getTargetPosition: d => d.destination,
        getSourceColor: [0, 200, 255],
        getTargetColor: [255, 100, 0],
        getWidth: 2,
      }),
    ]}
  />
);
```
2. Risk Heat Map Overlay (D3.js)
```tsx
// frontend/src/components/RiskHeatMap.tsx
// D3-based choropleth overlay showing disruption risk per supply node
// Color scale: green (0.0) → yellow (0.5) → red (1.0)
// Updates every 30s via polling Dev A's /risk-score endpoint
```
3. Inventory Dashboard (Recharts)
```tsx
// frontend/src/components/InventoryDashboard.tsx
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const InventoryDashboard = ({ stockData, demandData }) => (
  <div className="grid grid-cols-2 gap-4 p-4">
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={stockData}>
        <Line type="monotone" dataKey="safety_stock" stroke="#00c8ff" />
        <Line type="monotone" dataKey="current_stock" stroke="#ff6400" />
        <XAxis dataKey="sku_id" />
        <YAxis />
        <Tooltip />
      </LineChart>
    </ResponsiveContainer>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={demandData}>
        <Bar dataKey="demand_variance" fill="#a855f7" />
        <XAxis dataKey="node" />
        <YAxis />
        <Tooltip />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
```
4. API Client (against shared/api-spec.yaml)
```typescript
// frontend/src/api/nexusApi.ts
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const getRiskScore = (nodeId: string, horizon = '72h') =>
  axios.get(`${BASE}/risk-score`, { params: { node_id: nodeId, time_horizon: horizon } });

export const getCurrentRouting = () =>
  axios.get(`${BASE}/routing/current`);

export const getSafetyStock = (skuId: string) =>
  axios.get(`${BASE}/inventory/safety-stock`, { params: { sku_id: skuId } });

export const getLedgerProvenance = (skuId: string) =>
  axios.get(`${BASE}/ledger/provenance/${skuId}`);
```
Use mock data until Dev A's server is confirmed live.
Deliverables by Day 2 Noon
[ ] 3D global map rendering with risk node overlays
[ ] Risk heat map updating every 30 seconds
[ ] Inventory dashboard showing safety stock vs. current stock
[ ] All API calls wired to Dev A's endpoints (or mock fallback)
---
Day 2 PM — Demo Scenario + Pitch Polish
Goal
Wire the "Red Sea Closure" demo trigger button, polish the UI, build pitch slides, rehearse.
Tasks
1. Demo Trigger Button
```tsx
// frontend/src/components/DemoControls.tsx
const injectRedSeaClosure = async () => {
  setDemoState('injecting');
  await axios.post(`${BASE}/risk-score`, {
    node_id: 'RED_SEA_CORRIDOR',
    override_score: 0.95,
    event_type: 'geopolitical_closure'
  });
  setDemoState('rerouting');
  // Map animates rerouting as NAVIGATOR responds
};

<button
  onClick={injectRedSeaClosure}
  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
>
  🔴 Inject Red Sea Closure Event
</button>
```
2. Animated Rerouting
When the demo event fires, the ArcLayer on the 3D map should animate freight routes shifting from Red Sea to Cape of Good Hope route.
Show real-time cost delta and delay delta in a pop-up overlay.
3. UI Polish Checklist
[ ] Dark theme (Tailwind `dark:` classes) — ops dashboards are dark by convention
[ ] Responsive layout for demo laptop screen
[ ] Loading states on all data-fetching components
[ ] Error boundaries on all API calls (demo must not crash)
[ ] NEXUS-SC logo and branding in header
4. Final Integration Test with Dev A
[ ] All API endpoints reachable from the frontend
[ ] End-to-end demo flow works: inject → reroute → inventory update → ledger log
[ ] Merge `dev-b-frontend` → `main` after joint confirmation
---
Success Metrics — Dev B
Metric	Target
Chaincode deployment	Successful on Hyperledger test network
ZKP compliance verification	Returns correct result for test hashesdaaa
mTLS enforcement	Unencrypted inter-service call fails
3D map render performance	>30fps on demo laptop
Demo button → rerouting animation	<3 seconds end-to-end
UI uptime during demo	100% — no crashes
---
⬡ NEXUS-SC | Dev B — Blockchain + Security + Frontend ⬡