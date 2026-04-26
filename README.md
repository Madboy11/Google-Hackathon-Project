# NEXUS-SC: Autonomous Supply Chain Control Tower

An elite, zero-static-data supply chain control tower built for the Google Hackathon. NEXUS-SC ingests real-time global telemetry, assesses geopolitical and meteorological risk, and uses Gemini 2.5 Flash as an autonomous reasoning core to orchestrate live routing logic via FastMCP.

## Architecture

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS (`@tailwindcss/forms`), Zustand, React-Query.
- **Mapping**: Deck.gl & MapLibre for 3D WebGL data visualization of live global marine traffic and disruption density.
- **Backend Orchestrator**: Python FastAPI running the Gemini A2A (Agent-to-Agent) reasoning core.
- **FastMCP Server**: Python backend serving 6 live intelligence tools to the reasoning core via Server-Sent Events (SSE).
- **Websocket Proxy**: Real-time multiplexer rebroadcasting AISStream telemetry to the React client.

## Intelligence Tools (MCP)
The NEXUS core operates entirely on live data. There are zero mocked static endpoints.
1. `get_vessel_positions`: Pulls live positional telemetry via OpenSky REST APIs.
2. `get_port_congestion`: Dynamically scrapes and scores port wait times.
3. `get_disruption_signals`: Interfaces with GDELT 2.0 API for real-time disruption events.
4. `get_weather_hazards`: Interfaces with Open-Meteo for live wind and precipitation data.
5. `get_geopolitical_risk_index`: Queries GDELT Timeline Volume API for macro risk metrics.
6. `optimise_route`: Utilizes OpenStreetMap Nominatim and OSRM for dynamic routing logic.

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.11+)
- Gemini API Key

### 2. Environment Setup
Configure the environment variables by renaming `.env.example` to `.env` in both the `frontend` and `backend` directories. Ensure `GEMINI_API_KEY` is present in the backend.

### 3. Running Locally
Use the provided PowerShell orchestration script to launch all 4 microservices simultaneously:

```powershell
.\run.ps1
```

Or run them individually:
1. `backend/mcp_server.py` (Port 8000)
2. `backend/ws_proxy.py` (Port 8001)
3. `backend/agent/orchestrator.py` (Port 8002)
4. `cd frontend && npm run dev` (Port 5173)

## Usage
Once booted, the agent automatically scans global corridors every 5 minutes. You can also chat directly with the NEXUS core in the right-hand panel (e.g., "What is the current risk profile for the Strait of Malacca?"). The reasoning stream will output live.

## Hackathon Features
- **Zero Static Mock Data**: All data is live or algorithmically derived from live proxies.
- **A2A Pipeline**: Complete separation of frontend rendering and agent logic. The frontend simply maps the agent's thought process as it streams over the SSE connection.
- **Performance Profiling**: Zustand selectors enforce strict React re-rendering boundaries. `react-window` enables zero-lag virtualized scrolling for massive disruption data feeds.
