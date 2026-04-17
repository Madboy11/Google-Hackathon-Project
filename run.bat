@echo off
TITLE NEXUS-SC Launcher
echo ==========================================================
echo    ⬡ NEXUS-SC: Neural EXtended Unified Supply-Chain System
echo ==========================================================
echo.

:: 1. Docker Infrastructure
echo [1/3] Starting Infrastructure (Docker)...
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo    [!] Warning: docker-compose failed or Docker is not running.
) else (
    echo    [+] Infrastructure services are running.
)
echo.

:: 2. Backend (FastAPI)
echo [2/3] Starting Backend Engine (FastAPI) in new window...
:: Check for venv
if exist "venv\Scripts\activate.bat" (
    start "NEXUS-SC Backend" cmd /k "venv\Scripts\activate.bat && cd backend && uvicorn main:app --reload --port 8000"
) else (
    start "NEXUS-SC Backend" cmd /k "cd backend && uvicorn main:app --reload --port 8000"
)
echo    [+] Backend launcher sent to new window.
echo.

:: 3. Frontend (Vite)
echo [3/3] Starting Frontend Dashboard (Vite) in new window...
start "NEXUS-SC Frontend" cmd /k "cd frontend && npm run dev"
echo    [+] Frontend launcher sent to new window.
echo.

echo ==========================================================
echo    NEXUS-SC SERVICES ARE STARTING UP!
echo ==========================================================
echo • API ^& Documents: http://localhost:8000/docs
echo • Frontend UI: Check the new terminal for the Vite URL.
echo.
echo Press any key to close this launcher...
pause > nul
