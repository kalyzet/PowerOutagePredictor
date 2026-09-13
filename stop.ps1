$ports = @(8000, 5173)
$found = $false

foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        $found = $true
        foreach ($c in $conns) {
            $procId = $c.OwningProcess
            $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
            Write-Host "Stopping $name (PID $procId) on port $port..." -ForegroundColor Yellow
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            taskkill /F /T /PID $procId 2>&1 | Out-Null
        }
    }
}

if (-not $found) {
    Write-Host "No servers running on 8000/5173." -ForegroundColor Green
    exit 0
}

Start-Sleep 2

# Fallback: if ghost/child processes still hold the ports, kill all python+node
$stillUsed = Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue
if ($stillUsed) {
    Write-Host "Ports still occupied. Killing orphan processes..." -ForegroundColor Yellow
    taskkill /F /IM python.exe /T 2>&1 | Out-Null
    taskkill /F /IM uvicorn.exe /T 2>&1 | Out-Null
    taskkill /F /IM node.exe /T 2>&1 | Out-Null
    Start-Sleep 2
}

$final = Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue
if ($final) {
    Write-Host "ERROR: Some ports still in use after cleanup!" -ForegroundColor Red
} else {
    Write-Host "All servers stopped." -ForegroundColor Green
}
