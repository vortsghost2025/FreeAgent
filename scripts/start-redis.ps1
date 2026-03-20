# Start Redis/Memurai for FreeAgent
# This script attempts to start Memurai (Windows Redis) or fall back to Redis

$ErrorActionPreference = 'Continue'

Write-Host '[Redis] Checking for Memurai/Redis...' -ForegroundColor Yellow

# Check for Memurai (Windows Redis alternative)
$memuraiPath = 'C:\Program Files\Memurai\memurai.exe'
$memuraiCli = 'C:\Program Files\Memurai\memurai-cli.exe'

if (Test-Path $memuraiPath) {
    Write-Host '[Redis] Starting Memurai...' -ForegroundColor Green
    
    # Check if already running
    $memurai = Get-Process -Name 'memurai' -ErrorAction SilentlyContinue
    if ($memurai) {
        Write-Host '[Redis] Memurai already running' -ForegroundColor Gray
    } else {
        Start-Process -FilePath $memuraiPath -WindowStyle Hidden
        Start-Sleep -Seconds 2
        Write-Host '[Redis] Memurai started' -ForegroundColor Green
    }
}
elseif (Get-Command 'redis-server' -ErrorAction SilentlyContinue) {
    Write-Host '[Redis] Starting Redis server...' -ForegroundColor Green
    Start-Process powershell -ArgumentList '-NoExit', '-Command', 'redis-server' -WindowStyle Hidden
}
else {
    Write-Host '[Redis] Memurai/Redis not found. Using in-memory store instead.' -ForegroundColor Gray
    Write-Host '[Redis] Install Memurai from https://www.memurai.com/' -ForegroundColor Gray
}

Write-Host '[Redis] Done' -ForegroundColor Green
