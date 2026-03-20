# swarm-status.ps1 - FreeAgent Swarm Health Monitoring
# Check status of all swarm components

param(
    [switch]$Watch = $false,
    [switch]$Json = $false
)

$ErrorActionPreference = "Continue"

# Colors for console output
function Write-Cyan { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Green { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Yellow { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Red { param($msg) Write-Host $msg -ForegroundColor Red }
function Write-Gray { param($msg) Write-Host $msg -ForegroundColor Gray }

# Check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Get process on port
function Get-PortProcess {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conn) {
        $proc = Get-Process -Id $conn[0].OwningProcess -ErrorAction SilentlyContinue
        return $proc.ProcessName
    }
    return $null
}

# Check Redis/Memurai
function Test-Redis {
    $redisRunning = $false
    $memurai = Get-Process -Name "memurai" -ErrorAction SilentlyContinue
    $redis-cli = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    
    if ($memurai -or $redis-cli) {
        $redisRunning = $true
    }
    
    # Try TCP connection
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("localhost", 6379)
        $client.Close()
        $redisRunning = $true
    } catch {
        # Redis not accessible
    }
    
    return $redisRunning
}

# Check LM Studio
function Test-LMStudio {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:1234/v1/models" -TimeoutSec 2 -ErrorAction SilentlyContinue
        return $response.data -ne $null
    } catch {
        return $false
    }
}

# Check Node services
function Test-NodeService {
    param([string]$Name, [int]$Port)
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        return @{ Name = $Name; Port = $Port; Status = "running"; Info = $response }
    } catch {
        return @{ Name = $Name; Port = $Port; Status = "stopped"; Info = $null }
    }
}

# Main status check
function Get-SwarmStatus {
    $status = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Services = @{}
        Ports = @{}
        System = @{}
    }
    
    # Check ports
    $ports = @{
        "Memurai/Redis" = 6379
        "Main Server" = 3000
        "Cockpit UI" = 3001
        "LM Studio" = 1234
    }
    
    foreach ($portName in $ports.Keys) {
        $port = $ports[$portName]
        $status.Ports[$portName] = @{
            Port = $port
            InUse = Test-Port -Port $port
            Process = Get-PortProcess -Port $port
        }
    }
    
    # Check Redis
    $status.Services["Redis/Memurai"] = @{
        Status = if (Test-Redis) { "running" } else { "stopped" }
    }
    
    # Check LM Studio
    $status.Services["LM Studio"] = @{
        Status = if (Test-LMStudio) { "running" } else { "stopped" }
    }
    
    # Check Node services
    $status.Services["Main Server"] = Test-NodeService -Name "Main" -Port 3000
    $status.Services["Cockpit"] = Test-NodeService -Name "Cockpit" -Port 3001
    
    # System info
    $mem = Get-CimInstance Win32_OperatingSystem
    $status.System["Memory"] = @{
        TotalGB = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 2)
        FreeGB = [math]::Round($mem.FreePhysicalMemory / 1MB, 2)
        UsedPercent = [math]::Round(100 - ($mem.FreePhysicalMemory / $mem.TotalVisibleMemorySize * 100), 1)
    }
    
    $cpu = Get-CimInstance Win32_Processor
    $status.System["CPU"] = @{
        Name = $cpu.Name
        Cores = $cpu.NumberOfCores
        Usage = (Get-Counter '\\Processor(_Total)\\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples[0].CookedValue
    }
    
    return $status
}

# Display status
function Show-Status {
    param($Status)
    
    Clear-Host
    Write-Cyan "╔════════════════════════════════════════════════════════════╗"
    Write-Cyan "║          🚀 FREEAGENT SWARM STATUS                      ║"
    Write-Cyan "╚════════════════════════════════════════════════════════════╝"
    Write-Cyan ""
    Write-Cyan "Timestamp: $($Status.Timestamp)"
    Write-Cyan ""
    
    # System
    Write-Cyan "┌─ SYSTEM ────────────────────────────────────────────────"
    $mem = $Status.System.Memory
    Write-Host "  CPU:     $($Status.System.CPU.Name)" -ForegroundColor White
    Write-Host "  Cores:   $($Status.System.CPU.Cores)" -ForegroundColor White
    $cpuUsage = [math]::Round($Status.System.CPU.Usage, 1)
    $cpuColor = if ($cpuUsage -gt 80) { "Red" } elseif ($cpuUsage -gt 50) { "Yellow" } else { "Green" }
    Write-Host "  Usage:   $cpuUsage%" -ForegroundColor $cpuColor
    $memColor = if ($mem.UsedPercent -gt 85) { "Red" } elseif ($mem.UsedPercent -gt 70) { "Yellow" } else { "Green" }
    Write-Host "  RAM:     $($mem.UsedPercent)% used ($($mem.UsedGB)GB / $($mem.TotalGB)GB)" -ForegroundColor $memColor
    Write-Cyan ""
    
    # Services
    Write-Cyan "┌─ SERVICES ───────────────────────────────────────────────"
    foreach ($service in $Status.Services.Keys) {
        $svc = $Status.Services[$service]
        $svcStatus = $svc.Status
        $statusColor = if ($svcStatus -eq "running") { "Green" } else { "Red" }
        Write-Host "  $service`: " -NoNewline -ForegroundColor White
        Write-Host $svcStatus.ToUpper() -ForegroundColor $statusColor
    }
    Write-Cyan ""
    
    # Ports
    Write-Cyan "┌─ PORTS ─────────────────────────────────────────────────"
    foreach ($portName in $Status.Ports.Keys) {
        $p = $Status.Ports[$portName]
        $portStatus = if ($p.InUse) { "OPEN" } else { "CLOSED" }
        $portColor = if ($p.InUse) { "Green" } else { "Red" }
        Write-Host "  $($portName) ($($p.Port)): " -NoNewline -ForegroundColor White
        Write-Host $portStatus -ForegroundColor $portColor
        if ($p.Process) {
            Write-Gray "    └─ Process: $($p.Process)"
        }
    }
    Write-Cyan ""
    
    # Summary
    $running = ($Status.Services.Values | Where-Object { $_.Status -eq "running" }).Count
    $total = $Status.Services.Count
    Write-Cyan "┌─ SUMMARY ───────────────────────────────────────────────"
    Write-Host "  Services: $running / $total running" -ForegroundColor $(if ($running -eq $total) { "Green" } else { "Yellow" })
    Write-Cyan ""
}

# Main loop
do {
    $status = Get-SwarmStatus
    
    if ($Json) {
        $status | ConvertTo-Json -Depth 4
    } else {
        Show-Status -Status $status
    }
    
    if ($Watch) {
        Write-Gray "`nPress Ctrl+C to stop watching..."
        Start-Sleep -Seconds 5
    } else {
        break
    }
} while ($Watch)
