Write-Host "Starting NEXUS-SC Stack..." -ForegroundColor Green

# 1. FastMCP Server
Start-Process -NoNewWindow -FilePath "venv\Scripts\python.exe" -ArgumentList "backend\mcp_server.py"
Write-Host "FastMCP Server starting on port 8000..."

# 2. WebSocket Proxy
Start-Process -NoNewWindow -FilePath "venv\Scripts\python.exe" -ArgumentList "backend\ws_proxy.py"
Write-Host "WebSocket Proxy starting on port 8001..."

# 3. A2A Orchestrator
Start-Process -NoNewWindow -FilePath "venv\Scripts\python.exe" -ArgumentList "backend\agent\orchestrator.py"
Write-Host "A2A Orchestrator starting on port 8002..."

# 4. Frontend
Set-Location frontend
Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run", "dev"
Write-Host "Frontend starting on port 5173..."
Set-Location ..

Write-Host "All services started! Press Ctrl+C to terminate." -ForegroundColor Cyan
