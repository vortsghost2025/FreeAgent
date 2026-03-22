# watchdog.ps1 - Self-Healing Agent Watchdog for FreeAgent Swarm
# Monitors agent processes and restarts them if they crash

param(
    [int]$IntervalSeconds = 30,
    [switch]$AutoRestart = $true
)

$ErrorActionPreference = "Continue"

# Configuration
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

# Agent configurations to monitor
$AGENTS = @(
    @{
        Name = "Orchestrator"
        Script = "orchestrator\orchestrator.js"
        ProcessPattern = "node.*orchestrator"
        Port = 3000
    },
    @{
        Name = "Router Agent"
        Script = "services\routerAgent.js"
        ProcessPattern = "node.*routerAgent"
        Port = $null
    },
    @{
        Name = "Claw Adapter"
        Script = "services\clawAdapter.js"
        ProcessPattern = "node.*clawAdapter"
        Port = $null
    },
    @{
        Name = "Kilo Agent"
        Script = "services\kiloAgent.js"
        ProcessPattern = "node.*kiloAgent"
        Port = $null
    },
    @{
        Name = "Main Server"
        Script = "server.js"
        ProcessPattern = "node.*server\.js"
        Port = 3000
    }
)

# Log file
$LOG_FILE = Join-Path $scriptDir "logs\watchdog.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Ensure logs directory exists
    $logDir = Split-Path $LOG_FILE -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    Add-Content -Path $LOG_FILE -Value $logEntry
    
    switch ($Level) {
        "ERROR" { Write-Host $logEntry -ForegroundColor Red }
        "WARN"  { Write-Host $logEntry -ForegroundColor Yellow }
        "OK"    { Write-Host $logEntry -ForegroundColor Green }
        default  { Write-Host $logEntry -ForegroundColor Gray }
    }
}

function Get-NodeProcesses {
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
    return $processes
}

function Test-AgentRunning {
    param($Agent)
    
    $processes = Get-NodeProcesses
    
    foreach ($proc in $processes) {
        $cmdLine = $proc.CommandLine
        if ($cmdLine -match $Agent.ProcessPattern) {
            return @{
                Running = $true
                ProcessId = $proc.Id
                CommandLine = $cmdLine
            }
        }
    }
    
    return @{ Running = $false; ProcessId = $null }
}

function Test-PortResponding {
    param([int]$Port)
    
    if (-not $Port) { return $true }
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Start-Agent {
    param($Agent)
    
    $scriptPath = Join-Path $rootDir $Agent.Script
    
    if (-not (Test-Path $scriptPath)) {
        Write-Log "Script not found: $scriptPath" "ERROR"
        return $false
    }
    
    Write-Log "Starting $($Agent.Name)..." "WARN"
    
    try {
        $workingDir = Split-Path $scriptPath -Parent
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; node $($Agent.Script)" -WindowStyle Normal -WorkingDirectory $rootDir
        Write-Log "Started $($Agent.Name)" "OK"
        return $true
    } catch {
        Write-Log "Failed to start $($Agent.Name): $_" "ERROR"
        return $false
    }
}

function Restart-Agent {
    param($Agent)
    
    Write-Log "Restarting $($Agent.Name)..." "WARN"
    
    # Kill existing process
    $processes = Get-NodeProcesses
    foreach ($proc in $processes) {
        if ($proc.CommandLine -match $Agent.ProcessPattern) {
            Write-Log "Stopping PID $($proc.Id)" "WARN"
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
    }
    
    # Start fresh
    Start-Agent -Agent $Agent
}

function Test-RedisAvailable {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("localhost", 6379)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Test-MemuraiAvailable {
    $memurai = Get-Process -Name "memurai" -ErrorAction SilentlyContinue
    return $null -ne $memurai
}

# Main watchdog loop
function Start-Watchdog {
    Write-Log "========================================" "INFO"
    Write-Log "FreeAgent Swarm Watchdog Starting" "INFO"
    Write-Log "Interval: $IntervalSeconds seconds" "INFO"
    Write-Log "Auto-Restart: $AutoRestart" "INFO"
    Write-Log "========================================" "INFO"
    
    $restartCounts = @{}
    $AGENTS | ForEach-Object { $restartCounts[$_.Name] = 0 }
    
    while ($true) {
        $timestamp = Get-Date -Format "HH:mm:ss"
        
        # Check Redis/Memurai
        $redisOk = Test-RedisAvailable
        $memuraiOk = Test-MemuraiAvailable
        
        if (-not $redisOk -and -not $memuraiOk) {
            Write-Log "WARNING: Redis/Memurai not available" "WARN"
        }
        
        # Check each agent
        foreach ($agent in $AGENTS) {
            $status = Test-AgentRunning -Agent $agent
            
            if (-not $status.Running) {
                Write-Log "$($agent.Name): NOT RUNNING" "WARN"
                
                if ($AutoRestart) {
                    $startResult = Start-Agent -Agent $agent
                    if ($startResult) {
                        $restartCounts[$agent.Name]++
                        Write-Log "$($agent.Name): Restarted (count: $($restartCounts[$agent.Name]))" "OK"
                    }
                }
            } else {
                # Check port if specified
                if ($agent.Port) {
                    $portOk = Test-PortResponding -Port $agent.Port
                    if (-not $portOk) {
                        Write-Log "$($agent.Name): Port $($agent.Port) not responding" "WARN"
                        
                        if ($AutoRestart) {
                            Restart-Agent -Agent $agent
                            $restartCounts[$agent.Name]++
                        }
                    } else {
                        Write-Log "$($agent.Name): Running (PID: $($status.ProcessId))" "OK"
                    }
                } else {
                    Write-Log "$($agent.Name): Running (PID: $($status.ProcessId))" "OK"
                }
            }
        }
        
        Write-Host "--- Cycle complete, sleeping $IntervalSeconds seconds ---" "INFO"
        Start-Sleep -Seconds $IntervalSeconds
    }
}

# Handle Ctrl+C
$script:Running = $true
$handler = {
    Write-Host ""
    Write-Log "Shutdown signal received" "INFO"
    $script:Running = $false
}
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $handler

# Start the watchdog
try {
    Start-Watchdog
} finally {
    Write-Log "Watchdog stopped" "INFO"
}
