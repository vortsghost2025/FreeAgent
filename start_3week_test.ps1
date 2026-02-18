
# 3-Week Continuous Trading Experiment
# Starts the trading bot in a separate detached process

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$logFile = Join-Path $PSScriptRoot "logs\trading_run_$timestamp.log"
$pidFile = Join-Path $PSScriptRoot "trading_bot.pid"

# Ensure logs directory exists
$logsDir = Join-Path $PSScriptRoot "logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

Write-Host "=================================="
Write-Host "📊 CONTINUOUS TRADING BOT"
Write-Host "3-Week Experiment Starting"
Write-Host "=================================="
Write-Host ""
Write-Host "Configuration:"
Write-Host "  Account Balance: $80 USD"
Write-Host "  Trading Pair: SOL/USDT"
Write-Host "  Mode: Paper Trading"
Write-Host "  Risk Per Trade: 0.5%"
Write-Host "  Max Daily Loss: 5%"
Write-Host ""
Write-Host "Log File: $logFile"
Write-Host ""

# Start Python process in separate window so it doesn't die when shell closes
$process = Start-Process -FilePath "python" -ArgumentList "continuous_trading.py" `
    -WorkingDirectory $PSScriptRoot `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $logFile `
    -PassThru `
    -NoNewWindow

# Save PID for monitoring
$process.Id | Out-File -FilePath $pidFile -NoNewline

Write-Host "✅ Bot started with PID: $($process.Id)"
Write-Host "   Process will continue even if terminal closes"
Write-Host ""
Write-Host "Monitor logs with:"
Write-Host "  Get-Content $logFile -Wait"
Write-Host ""
Write-Host "Stop bot with:"
Write-Host ("  Stop-Process -Id " + $process.Id)
Write-Host ""
