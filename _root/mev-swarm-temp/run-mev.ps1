# MEV Swarm Launcher - PowerShell version with process killing
# Run with: .\run-mev.ps1

Write-Host "Starting MEV Swarm..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing node processes running simple-launcher
Write-Host "Checking for existing MEV processes..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
    $_.CommandLine -like "*simple-launcher*" -or $_.CommandLine -like "*mev-swarm*"
}

if ($nodeProcesses) {
    Write-Host "Found existing node processes, killing..." -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "  Killing PID $($_.Id)..." -ForegroundColor Red
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "No existing processes found." -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting MEV Swarm Bot..." -ForegroundColor Cyan
Write-Host ""

# Run the bot
node simple-launcher.js
