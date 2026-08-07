# Power Outage Predictor - one-command dev server
# Starts backend (FastAPI) and frontend (Vite) together.
# Press Ctrl+C to stop both.

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Test-PortInUse {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        return $null -ne $conn
    } catch {
        return $false
    }
}

# 1. Pick python from existing virtual env (.venv preferred, fallback venv)
$venvPython = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    $venvPython = Join-Path $Root "venv\Scripts\python.exe"
}
if (-not (Test-Path $venvPython)) {
    Write-Host "[ERROR] Virtual env not found. Create one first (python -m venv .venv)." -ForegroundColor Red
    exit 1
}

# 2. Check backend dependencies are installed (avoid "site can't be reached" from import errors)
$req = Join-Path $Root "backend\requirements.txt"
$probe = & $venvPython -c "import fastapi,uvicorn,sqlalchemy,joblib,sklearn,pandas,numpy,openpyxl,multipart" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] Backend dependencies missing. Installing from requirements.txt..." -ForegroundColor Cyan
    & $venvPython -m pip install -r $requ
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install backend dependencies." -ForegroundColor Red
        exit 1
    }
}

# 3. Check ports are free
if (Test-PortInUse 8000) {
    Write-Host "[ERROR] Port 8000 is already in use. Stop the existing backend first." -ForegroundColor Red
    exit 1
}
if (Test-PortInUse 5173) {
    Write-Host "[ERROR] Port 5173 is already in use. Stop the existing frontend first." -ForegroundColor Red
    exit 1
}

# 4. Log files (temporary, per session)
$backendLog  = Join-Path $env:TEMP "pop-backend.log"
$backendErr  = Join-Path $env:TEMP "pop-backend.err.log"
$frontendLog = Join-Path $env:TEMP "pop-frontend.log"
$frontendErr = Join-Path $env:TEMP "pop-frontend.err.log"
Remove-Item -Path $backendLog, $backendErr, $frontendLog, $frontendErr -ErrorAction SilentlyContinue

# 5. Start backend & frontend as background processes
Write-Host "Starting backend  (uvicorn on :8000)..." -ForegroundColor Cyan
$backend = Start-Process -FilePath $venvPython -ArgumentList "-m", "uvicorn", "app.main:app", "--reload" `
    -WorkingDirectory (Join-Path $Root "backend") `
    -RedirectStandardOutput $backendLog -RedirectStandardError $backendErr -PassThru -WindowStyle Hidden

Write-Host "Starting frontend (vite on :5173)..." -ForegroundColor Cyan
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" `
    -WorkingDirectory (Join-Path $Root "frontend") `
    -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendErr -PassThru -WindowStyle Hidden

Write-Host ""
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor Green
Write-Host "  API      : http://localhost:8000" -ForegroundColor Green
Write-Host "  Swagger  : http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Logs: backend -> $backendLog" -ForegroundColor DarkGray
Write-Host "      frontend-> $frontendLog" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Yellow
Write-Host ""

# 6. Live-tail both logs in the same console
$tailBackend  = Start-Job -ArgumentList $backendLog  -ScriptBlock { Get-Content $args[0] -Wait -Tail 20 }
$tailFrontend = Start-Job -ArgumentList $frontendLog -ScriptBlock { Get-Content $args[0] -Wait -Tail 20 }

try {
    while ($true) {
        Receive-Job -Job $tailBackend, $tailFrontend
        if ($backend.HasExited) { throw "Backend exited unexpectedly (code $($backend.ExitCode)). See $backendErr" }
        if ($frontend.HasExited) { throw "Frontend exited unexpectedly (code $($frontend.ExitCode)). See $frontendErr" }
        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host ""
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    if (-not $backend.HasExited) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
    if (-not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
    Stop-Job -Job $tailBackend, $tailFrontend -ErrorAction SilentlyContinue
    Remove-Job -Job $tailBackend, $tailFrontend -Force -ErrorAction SilentlyContinue
    Write-Host "Done." -ForegroundColor Green
}
