# MEV-Swarm Stress Test Runner
# Quick script to run watcher stress test and capture metrics

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       MEV-Swarm Stress Test Runner                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$TestDuration = 300  # 5 minutes in seconds
$LogFile = "stress-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$ResultsFile = "STRESS_TEST_RESULTS.md"

Write-Host "📋 Test Configuration:" -ForegroundColor Yellow
Write-Host "   Duration: $TestDuration seconds ($([math]::Round($TestDuration/60, 1)) minutes)" -ForegroundColor White
Write-Host "   Log file: $LogFile" -ForegroundColor White
Write-Host "   Results template: $ResultsFile" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Starting stress test..." -ForegroundColor Green
Write-Host "   Watcher will run for $TestDuration seconds" -ForegroundColor White
Write-Host "   Monitor Task Manager for CPU/memory usage" -ForegroundColor White
Write-Host "   Press Ctrl+C to stop early" -ForegroundColor White
Write-Host ""

# Start watcher with log capture
$WatcherProcess = Start-Process -FilePath "node" -ArgumentList "block-watcher.js" -RedirectStandardOutput $LogFile -RedirectStandardError $LogFile

Write-Host "✅ Watcher started (PID: $($WatcherProcess.Id))" -ForegroundColor Green
Write-Host "📊 Logging to: $LogFile" -ForegroundColor Green
Write-Host ""
Write-Host "⏱️  Timer running... ($([math]::Round($TestDuration/60, 1)) minutes remaining)" -ForegroundColor Yellow
Write-Host ""

# Countdown timer
$Remaining = $TestDuration
while ($Remaining -gt 0) {
    $Minutes = [math]::Floor($Remaining / 60)
    $Seconds = $Remaining % 60
    Write-Host "`r⏱️  Time remaining: $($Minutes)m $($Seconds)s " -NoNewline

    Start-Sleep -Seconds 5
    $Remaining -= 5

    # Check if process is still running
    if ($WatcherProcess.HasExited) {
        Write-Host "`r❌ Watcher process exited unexpectedly!" -ForegroundColor Red
        break
    }
}

Write-Host "`r"  # Clear the countdown line

# Stop watcher
if (-not $WatcherProcess.HasExited) {
    Write-Host "⏹️  Stopping watcher..." -ForegroundColor Yellow
    Stop-Process -Id $WatcherProcess.Id -Force
    Write-Host "✅ Watcher stopped" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 Test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review log file: $LogFile" -ForegroundColor White
Write-Host "2. Fill out results template: $ResultsFile" -ForegroundColor White
Write-Host "3. Look for these key metrics:" -ForegroundColor White
Write-Host "   - '📡 RPC calls:' frequency" -ForegroundColor Cyan
Write-Host "   - '⚠️  Pending block has X transactions' cap hits" -ForegroundColor Cyan
Write-Host "   - '✅ Found in cache' vs '📡 Fetched metadata' ratio" -ForegroundColor Cyan
Write-Host "   - '🚀 Opportunity detected' emission rate" -ForegroundColor Cyan
Write-Host ""
Write-Host "📄 Open log file now? (Y/N)" -ForegroundColor Yellow
$Response = Read-Host
if ($Response -eq "Y" -or $Response -eq "y") {
    notepad $LogFile
}
