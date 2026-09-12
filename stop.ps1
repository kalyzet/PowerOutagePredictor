$conns = Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue
if (-not $conns) { Write-Host "No servers running on 8000/5173." -ForegroundColor Green; exit 0 }
foreach ($c in $conns) {
    $procId = $c.OwningProcess
    $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
    Write-Host "Stopping $name (PID $procId) on port $($c.LocalPort)..." -ForegroundColor Yellow
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}
Start-Sleep 1
$remaining = Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue
if ($remaining) { Write-Host "Some ports still in use. Try again." -ForegroundColor Red } else { Write-Host "All servers stopped." -ForegroundColor Green }
