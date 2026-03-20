# Start FreeAgent Agents
# Launches all agents for the swarm

$ErrorActionPreference = 'Continue'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Write-Host '[Agents] Starting FreeAgent agents...' -ForegroundColor Yellow

# Start Router Agent
$routerPath = Join-Path $rootDir 'cockpit\agents\routerAgent.js'
if (Test-Path $routerPath) {
    Start-Process powershell -ArgumentList '-NoExit', "-Command cd '$rootDir'; node cockpit/agents/routerAgent.js" -WindowStyle Normal
    Write-Host '[OK] Router Agent started' -ForegroundColor Green
}

# Start Base Agent
$baseAgentPath = Join-Path $rootDir 'cockpit\agents\baseAgent.js'
if (Test-Path $baseAgentPath) {
    Start-Process powershell -ArgumentList '-NoExit', "-Command cd '$rootDir'; node cockpit/agents/baseAgent.js" -WindowStyle Normal
    Write-Host '[OK] Base Agent started' -ForegroundColor Green
}

# Start Agent Capabilities (if exists)
$capabilitiesPath = Join-Path $rootDir 'cockpit\agents\agentCapabilities.js'
if (Test-Path $capabilitiesPath) {
    Start-Process powershell -ArgumentList '-NoExit', "-Command cd '$rootDir'; node cockpit/agents/agentCapabilities.js" -WindowStyle Normal
    Write-Host '[OK] Agent Capabilities started' -ForegroundColor Green
}

Write-Host '[Agents] All agents started' -ForegroundColor Green
