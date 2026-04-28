#!/bin/bash
# Start script for Railway/Render to run all backend services

echo "Starting Backend Services..."

# Navigate to backend and run all python services in the background
cd backend

# 1. Start MCP Tool Bridge
python mcp_server.py &

# 2. Start WebSocket Proxy
python ws_proxy.py &

# 3. Start A2A Orchestrator
python -m agent.orchestrator &

# 4. Start Core API (FastAPI)
uvicorn main:app --host 0.0.0.0 --port 8000 &

cd ..

# Wait 2 seconds for backend services to bind to their ports
sleep 2

echo "Starting API Gateway..."
# Run the node gateway on the port provided by Railway/Render
# Render/Railway provide the PORT env var. Gateway.js uses it.
node gateway.js
