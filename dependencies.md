# ⬡ NEXUS-SC — Dependency Reference

> All dependencies required to run the full NEXUS-SC stack. Organised by layer. Install instructions included for both Dev A and Dev B.

---

## Dev A — Backend / AI/ML (Python)

### `backend/requirements.txt`

```txt
# ── Web Framework ─────────────────────────────────────────────
fastapi==0.111.0
uvicorn[standard]==0.30.1
httpx==0.27.0
pydantic==2.7.1
python-multipart==0.0.9

# ── Async & Concurrency ───────────────────────────────────────
anyio==4.4.0

# ── Message Broker ───────────────────────────────────────────
kafka-python==2.0.2
confluent-kafka==2.4.0

# ── Caching ──────────────────────────────────────────────────
redis==5.0.4
hiredis==2.3.2

# ── Database ─────────────────────────────────────────────────
psycopg2-binary==2.9.9
sqlalchemy==2.0.30
alembic==1.13.1          # DB migrations
timescaledb                # TimescaleDB adapter (time-series)

# ── AI / ML — Core ───────────────────────────────────────────
torch==2.3.0
torchvision==0.18.0
numpy==1.26.4
pandas==2.2.2
scikit-learn==1.5.0
scipy==1.13.1

# ── Reinforcement Learning ───────────────────────────────────
stable-baselines3==2.3.2
gymnasium==0.29.1         # OpenAI Gym successor (env interface)
shimmy==1.3.0             # compatibility shim

# ── NLP / Transformers ───────────────────────────────────────
transformers==4.41.0
tokenizers==0.19.1
sentencepiece==0.2.0
datasets==2.19.1          # HuggingFace datasets

# ── GAN / Synthetic Data Generation ─────────────────────────
ctgan==0.9.0              # GAN-based tabular data synthesis
sdv==1.12.1               # Synthetic Data Vault

# ── Data Ingestion / Streaming ───────────────────────────────
apache-flink==1.19.0      # stream processing (Python API)
pyspark==3.5.1            # batch processing

# ── External API Connectors ──────────────────────────────────
requests==2.32.2
aiohttp==3.9.5
openweathermap-sdk==1.0.0 # or use requests to NOAA/OpenWeatherMap directly
gdelt==0.1.9              # GDELT geopolitical event stream

# ── Graph Database (Tier-N supplier mapping) ─────────────────
neo4j==5.21.0             # Neo4j Python driver

# ── Security (backend) ───────────────────────────────────────
python-jose[cryptography]==3.3.0   # JWT
passlib[bcrypt]==1.7.4
cryptography==42.0.7

# ── Observability ────────────────────────────────────────────
prometheus-client==0.20.0
opentelemetry-sdk==1.24.0
opentelemetry-instrumentation-fastapi==0.45b0

# ── Testing ──────────────────────────────────────────────────
pytest==8.2.1
pytest-asyncio==0.23.7
httpx==0.27.0             # async test client for FastAPI
```

### Installation

```bash
cd nexus-sc
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

---

## Dev A — Infrastructure (Docker Compose)

These run as Docker containers — no local install needed beyond Docker Desktop.

| Service | Image | Port |
|---------|-------|------|
| Apache Kafka | `confluentinc/cp-kafka:7.6.1` | `9092` |
| Zookeeper | `confluentinc/cp-zookeeper:7.6.1` | `2181` |
| Redis | `redis:7.2-alpine` | `6379` |
| PostgreSQL + TimescaleDB | `timescale/timescaledb:latest-pg16` | `5432` |
| Neo4j | `neo4j:5.21` | `7474`, `7687` |

### `docker-compose.yml` (shared, neutral ground)

```yaml
version: '3.9'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.1
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.6.1
    depends_on: [zookeeper]
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  redis:
    image: redis:7.2-alpine
    ports: ["6379:6379"]

  postgres:
    image: timescale/timescaledb:latest-pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: nexus
      POSTGRES_PASSWORD: nexus_dev
      POSTGRES_DB: nexus_sc

  neo4j:
    image: neo4j:5.21
    ports: ["7474:7474", "7687:7687"]
    environment:
      NEO4J_AUTH: neo4j/nexus_dev
```

```bash
docker-compose up -d
```

---

## Dev B — Frontend (Node.js / React)

### `frontend/package.json` dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.4.5",

    "tailwindcss": "^3.4.4",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19",

    "@deck.gl/react": "^9.0.13",
    "@deck.gl/layers": "^9.0.13",
    "@deck.gl/core": "^9.0.13",
    "maplibre-gl": "^4.3.2",

    "d3": "^7.9.0",
    "@types/d3": "^7.4.3",

    "recharts": "^2.12.7",

    "axios": "^1.7.2",

    "jsonwebtoken": "^9.0.2",
    "@types/jsonwebtoken": "^9.0.6",

    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0"
  },
  "devDependencies": {
    "vite": "^5.2.13",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^9.3.0",
    "@typescript-eslint/parser": "^7.11.0",
    "@typescript-eslint/eslint-plugin": "^7.11.0",
    "prettier": "^3.2.5"
  }
}
```

### Installation

```bash
cd nexus-sc/frontend
npm install
npm run dev        # Dev server on localhost:3000
```

---

## Dev B — Blockchain (Go + Hyperledger Fabric)

### Go modules (`blockchain/ledger/go.mod`)

```go
module nexus-ledger

go 1.21

require (
    github.com/hyperledger/fabric-contract-api-go v1.2.2
    github.com/hyperledger/fabric-chaincode-go v0.6.0
    github.com/hyperledger/fabric-protos-go v0.3.3
)
```

### Installation

```bash
# Install Go (if not installed)
# https://go.dev/dl/ — download Go 1.21+

# Install Hyperledger Fabric binaries and Docker images
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.4 1.5.9

# Verify
peer version
orderer version

# Install Go chaincode deps
cd blockchain/ledger
go mod tidy
go build ./...
```

### Hyperledger Fabric Docker Images

```bash
docker pull hyperledger/fabric-peer:2.5.4
docker pull hyperledger/fabric-orderer:2.5.4
docker pull hyperledger/fabric-ca:1.5.9
docker pull hyperledger/fabric-tools:2.5.4
docker pull hyperledger/fabric-ccenv:2.5.4
docker pull hyperledger/fabric-baseos:2.5.4
```

---

## Dev B — Security / FORTRESS

### Istio (mTLS service mesh)

```bash
# Install Istio CLI
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.22.0 sh -
export PATH=$PWD/istio-1.22.0/bin:$PATH

# Verify
istioctl version
```

### HashiCorp Vault (secrets management)

```bash
# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/vault

# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
apt install vault

# Start dev server
vault server -dev
```

### Python anomaly detection (FORTRESS module)

```bash
pip install scikit-learn==1.5.0 numpy==1.26.4
```

---

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 16 GB | 32 GB |
| CPU | 4 cores | 8+ cores |
| GPU | None (CPU training) | NVIDIA GPU (CUDA 12+) for faster RL training |
| Storage | 20 GB free | 40 GB free |
| Docker | 24.0+ | Latest |
| Node.js | 20 LTS | 22 LTS |
| Python | 3.11 | 3.11 |
| Go | 1.21 | 1.22 |
| OS | macOS 13 / Ubuntu 22.04 / Windows 11 + WSL2 | Ubuntu 22.04 |

---

## Quick Sanity Check — All Services

```bash
# After docker-compose up -d and all services started:

# Kafka
kafka-topics.sh --list --bootstrap-server localhost:9092

# Redis
redis-cli ping   # → PONG

# PostgreSQL
psql -h localhost -U nexus -d nexus_sc -c "SELECT version();"

# Neo4j
curl http://localhost:7474

# FastAPI (Dev A)
curl http://localhost:8000/health

# React (Dev B)
curl http://localhost:3000

# Hyperledger (Dev B)
peer chaincode query -C nexus-channel -n nexus-ledger -c '{"Args":["QueryEvent","test-001"]}'
```

---

## External APIs — Keys Required

| API | Purpose | Registration |
|-----|---------|--------------|
| OpenWeatherMap | Hyperlocal weather data | https://openweathermap.org/api |
| NOAA Climate Data | Historical weather | https://www.ncdc.noaa.gov/cdo-web/ |
| MarineTraffic | Live AIS vessel tracking | https://www.marinetraffic.com/en/ais-api-services |
| Alpha Vantage / Quandl | Commodity price feeds | https://www.alphavantage.co/ |
| GDELT | Geopolitical event stream | https://www.gdeltproject.org/ (free, no key) |
| Sentinel Hub | Satellite imagery (port congestion) | https://www.sentinel-hub.com/ |

Store all keys in `.env` (never committed). Use HashiCorp Vault in production.

---

*⬡ NEXUS-SC | Dependency Reference ⬡*
