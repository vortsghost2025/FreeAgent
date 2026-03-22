# Emergency Process Cleanup Script
# Run this to kill all zombie Node processes before restarting

Write-Host "=== EMERGENCY PROCESS CLEANUP ===" -ForegroundColor Red
Write-Host ""

# Check for Node processes
Write-Host "Checking for Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node processes:" -ForegroundColor Red
    $nodeProcesses | Format-Table Id, WorkingSet, CPU -AutoSize

    Write-Host ""
    Write-Host "Killing all Node processes..." -ForegroundColor Red

    foreach ($proc in $nodeProcesses) {
        Write-Host "  Killing PID $($proc.Id)..." -ForegroundColor DarkRed
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 2

    # Verify cleanup
    $remaining = Get-Process node -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host ""
        Write-Host "⚠️  Some processes still running!" -ForegroundColor Red
        $remaining | Format-Table Id, WorkingSet, CPU -AutoSize
    } else {
        Write-Host ""
        Write-Host "✅ All Node processes killed successfully" -ForegroundColor Green
    }
} else {
    Write-Host "✅ No Node processes found" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host "You can now restart your services safely" -ForegroundColor Green
Write-Host ""
Write-Host "To start watcher:" -ForegroundColor Cyan
Write-Host "  cd C:\workspace\medical\mev-swarm" -ForegroundColor Gray
Write-Host "  node block-watcher.js" -ForegroundColor Gray
