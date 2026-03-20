# scripts/boot-cockpit.ps1
# FreeAgent Swarm - Simple Single-Terminal Boot
# Run this in ONE terminal - no popups, no extra windows

param(
    [switch]$SkipKill = $false
)

$ErrorActionPreference = 'Continue'

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FREEAGENT SWARM - SINGLE TERMINAL   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set location to workspace root
$rootDir = "S:\workspace"
Set-Location $rootDir
Write-Host "[INFO] Working directory: $rootDir" -ForegroundColor Gray

# Step 1: Kill old processes (optional)
if (-not $SkipKill) {
    Write-Host "[1/3] Checking for processes on ports..." -ForegroundColor Yellow
    Get-NetTCPConnection -LocalPort 54112,6379 -ErrorAction SilentlyContinue | 
        ForEach-Object { 
            $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) { 
                Write-Host "  [INFO] Stopping $($proc.ProcessName) on port $($_.LocalPort)" -ForegroundColor Gray
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue 
            }
        }
} else {
    Write-Host "[1/3] Skipping port check" -ForegroundColor Gray
}

# Step 2: Check Redis (if not running)
Write-Host "[2/3] Checking Redis/Memurai..." -ForegroundColor Yellow
$redisCheck = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
if ($null -eq $redisCheck) {
    Write-Host "  [WARN] Redis not running on port 6379" -ForegroundColor Yellow
    Write-Host "  [INFO] Start Memurai manually if needed, or run: S:\workspace\redis\memurai.exe" -ForegroundColor Gray
} else {
    Write-Host "  [OK] Redis/Memurai is running" -ForegroundColor Green
}

# Step 3: Start Cockpit (includes everything)
Write-Host "[3/3] Starting Cockpit..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Starting FreeAgent Cockpit..." -ForegroundColor Green
Write-Host "  Keep this terminal open!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Change to cockpit directory and run
Set-Location "$rootDir\cockpit"
node server.js
