# scripts/health-check.ps1
# FreeAgent Swarm Health Verification

param(
    [switch]$Verbose = $false
)

$ErrorActionPreference = 'Continue'

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '          FREEAGENT SWARM HEALTH CHECK                     ' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''

$results = @{
    Passed = 0
    Failed = 0
}

$rootDir = Split-Path $PSScriptRoot -Parent
if (-not $rootDir) { $rootDir = $PSScriptRoot }

# ============================================
# 1. PORT CHECKS
# ============================================
Write-Host ''
Write-Host '--- [1/4] Port Availability ---' -ForegroundColor Cyan

$ports = @(3000, 3001, 1234, 6379)
$portNames = @('Main Server', 'Cockpit', 'LM Studio', 'Redis')

for ($i = 0; $i -lt $ports.Count; $i++) {
    $port = $ports[$i]
    $name = $portNames[$i]
    Write-Host "  Port $port ($name)..." -NoNewline
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($null -eq $conn) {
        Write-Host ' [OK] free' -ForegroundColor Green
        $results.Passed++
    } else {
        Write-Host ' [WARN] in use' -ForegroundColor Yellow
    }
}

# ============================================
# 2. FILE STRUCTURE
# ============================================
Write-Host ''
Write-Host '--- [2/4] File Structure ---' -ForegroundColor Cyan

$files = @(
    'orchestrator\orchestrator.js',
    'cockpit\agents\routerAgent.js',
    'clients\lmStudioClient.js',
    'cockpit\services\eventBus.js',
    'cockpit\services\metrics.js',
    'cockpit\package.json'
)

foreach ($file in $files) {
    $path = Join-Path $rootDir $file
    Write-Host "  $file..." -NoNewline
    if (Test-Path $path) {
        Write-Host ' [OK]' -ForegroundColor Green
        $results.Passed++
    } else {
        Write-Host ' [FAIL] missing' -ForegroundColor Red
        $results.Failed++
    }
}

# ============================================
# 3. DEPENDENCIES
# ============================================
Write-Host ''
Write-Host '--- [3/4] Dependencies ---' -ForegroundColor Cyan

Write-Host '  Node.js...' -NoNewline
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $version = node --version 2>$null
    Write-Host " [OK] $version" -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host ' [FAIL] not found' -ForegroundColor Red
    $results.Failed++
}

Write-Host '  npm...' -NoNewline
$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($npm) {
    $version = npm --version 2>$null
    Write-Host " [OK] v$version" -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host ' [FAIL] not found' -ForegroundColor Red
    $results.Failed++
}

Write-Host '  node_modules (cockpit)...' -NoNewline
if (Test-Path (Join-Path $rootDir 'cockpit\node_modules')) {
    Write-Host ' [OK] installed' -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host ' [FAIL] run npm install in cockpit/' -ForegroundColor Red
    $results.Failed++
}

# ============================================
# 4. ENVIRONMENT
# ============================================
Write-Host ''
Write-Host '--- [4/4] Environment ---' -ForegroundColor Cyan

Write-Host '  .env (root)...' -NoNewline
if (Test-Path (Join-Path $rootDir '.env')) {
    Write-Host ' [OK] exists' -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host ' [WARN] create from keys.example.env' -ForegroundColor Yellow
}

Write-Host '  CLAUDE_API_KEY...' -NoNewline
if ($env:CLAUDE_API_KEY) {
    Write-Host ' [OK] set' -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host ' [WARN] not set' -ForegroundColor Yellow
}

Write-Host '  GEMINI_PROJECT...' -NoNewline
if ($env:GEMINI_PROJECT) {
    Write-Host ' [OK] set' -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host ' [WARN] not set' -ForegroundColor Yellow
}

# ============================================
# SUMMARY
# ============================================
Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
$failCount = $results.Failed
$passCount = $results.Passed

if ($failCount -eq 0) {
    $summaryColor = 'Green'
} else {
    $summaryColor = 'Yellow'
}

Write-Host "Results: $passCount passed, $failCount failed" -ForegroundColor $summaryColor
Write-Host '============================================================' -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host ''
    Write-Host 'Swarm is ready to boot!' -ForegroundColor Green
    Write-Host 'Run: .\scripts\boot-cockpit.ps1' -ForegroundColor Cyan
} else {
    Write-Host ''
    Write-Host 'Fix the issues above before booting' -ForegroundColor Yellow
}
