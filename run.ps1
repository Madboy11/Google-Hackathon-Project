# NEXUS-SC Unified Run Script (Windows PowerShell)
# This script starts the Infrastructure (Docker), Backend (FastAPI), and Frontend (Vite).

Clear-Host
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "   ⬡ NEXUS-SC: Neural EXtended Unified Supply-Chain System   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host ""

# Set Project Root
$projectRoot = Get-Location

# 1. Check for Docker and Start Infrastructure
Write-Host "[1/3] Starting Infrastructure (Docker)..." -ForegroundColor Cyan
try {
    # Check if docker-compose exists
    if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
        docker-compose up -d
        if ($LASTEXITCODE -ne 0) {
            Write-Host "    [!] Warning: docker-compose failed. Ensure Docker Desktop is running." -ForegroundColor Red
        } else {
            Write-Host "    [+] Infrastructure services (Kafka, Redis, DBs) are running." -ForegroundColor Green
        }
    } else {
        Write-Host "    [!] docker-compose command not found. Skipping infrastructure step." -ForegroundColor Red
    }
} catch {
    Write-Host "    [!] Error interacting with Docker." -ForegroundColor Red
}

Write-Host ""

# 2. Start Backend AI/ML API (New Terminal)
Write-Host "[2/3] Starting Backend Engine (FastAPI) in new window..." -ForegroundColor Cyan
$backendDir = Join-Path $projectRoot "backend"
$venvPath = Join-Path $projectRoot "venv\Scripts\Activate.ps1"

# Prepare the command for the new shell
if (Test-Path $venvPath) {
    $backendCmd = ". `"$venvPath`"; cd `"$backendDir`"; uvicorn main:app --reload --port 8000"
} else {
    $backendCmd = "cd `"$backendDir`"; uvicorn main:app --reload --port 8000"
}

# Launch Backend terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location `"$backendDir`"; `$Host.UI.RawUI.WindowTitle = 'NEXUS-SC Backend'; $backendCmd" -WindowStyle Normal
Write-Host "    [+] Backend launcher sent to new terminal." -ForegroundColor Green

Write-Host ""

# 3. Start Frontend Dashboard (New Terminal)
Write-Host "[3/3] Starting Frontend Dashboard (Vite) in new window..." -ForegroundColor Cyan
$frontendDir = Join-Path $projectRoot "frontend"

$frontendCmd = "cd `"$frontendDir`"; npm run dev"

# Launch Frontend terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location `"$frontendDir`"; `$Host.UI.RawUI.WindowTitle = 'NEXUS-SC Frontend'; $frontendCmd" -WindowStyle Normal
Write-Host "    [+] Frontend launcher sent to new terminal." -ForegroundColor Green

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "   NEXUS-SC SERVICES ARE STARTING UP!   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "• API & Documentation: http://localhost:8000/docs"
Write-Host "• Frontend UI Dashboard: Check the new terminal for the Vite URL (usually http://localhost:5173)"
Write-Host ""
Write-Host "Keep the service terminals open to maintain the project running."
Write-Host "Press any key to close this launcher..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
