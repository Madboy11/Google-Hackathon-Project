@echo off
TITLE NEXUS-SC Launcher
echo ==========================================================
echo    NEXUS-SC: Neural EXtended Unified Supply-Chain System
echo ==========================================================
echo.

:: 1. Backend Services
echo [1/3] Starting Backend Services in new windows...

if exist "venv\Scripts\activate.bat" (
    start "FastMCP Server" cmd /k "venv\Scripts\activate.bat && cd backend && python mcp_server.py"
    start "WebSocket Proxy" cmd /k "venv\Scripts\activate.bat && cd backend && python ws_proxy.py"
    start "A2A Orchestrator" cmd /k "venv\Scripts\activate.bat && cd backend && python -m agent.orchestrator"
    start "NEXUS-SC Core API" cmd /k "venv\Scripts\activate.bat && cd backend && uvicorn main:app --host 0.0.0.0 --reload --port 8000"
) else (
    start "FastMCP Server" cmd /k "cd backend && python mcp_server.py"
    start "WebSocket Proxy" cmd /k "cd backend && python ws_proxy.py"
    start "A2A Orchestrator" cmd /k "cd backend && python -m agent.orchestrator"
    start "NEXUS-SC Core API" cmd /k "cd backend && uvicorn main:app --host 0.0.0.0 --reload --port 8000"
)
echo    [+] 4 Backend services sent to new windows.
echo.

:: 2. Frontend (Vite) & Gateway
echo [2/2] Starting Frontend and API Gateway...
start "NEXUS-SC Frontend" cmd /k "cd frontend && npm run dev -- --host"
start "NEXUS API Gateway" cmd /k "node gateway.js"
echo    [+] Frontend and Gateway sent to new windows.
echo.

:: 3. Public Exposure (Ngrok)
echo [3/3] Exposing to Public Internet via Ngrok...
start "NEXUS-SC Public Access" cmd /k "ngrok http 3000"
echo.

echo ==========================================================
echo    NEXUS-SC SERVICES ARE STARTING UP!
echo ==========================================================
echo ? Check the "NEXUS-SC Public Access" terminal for your Ngrok URL.
echo ? Give that public link (e.g., https://abc.ngrok-free.app) to your friend!
echo.
echo Press any key to close this launcher...
pause > nul
