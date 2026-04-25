<#
Memory Monitor - Auto-manage RAM usage
Usage:
  .\memory_monitor.ps1                    # Monitor only (show top processes every 30s)
  .\memory_monitor.ps1 -KillThreshold 90  # Kill processes when RAM > 90%
  .\memory_monitor.ps1 -KillThreshold 85 -SafeProcesses "Code,pwsh,powershell"
#>

param(
    [int]$KillThreshold = 0,           # % RAM usage to trigger killing (0 = monitor only)
    [int]$CheckInterval = 30,          # Seconds between checks
    [int]$TopN = 10,                   # Show top N processes
    [string[]]$SafeProcesses = @("Code","pwsh","powershell","powershell_ise","msedge","chrome","firefox"), # Never kill these
    [switch]$Verbose = $false
)

$script:running = $true
$script:lastKillTime = 0
$script:minKillInterval = 300  # 5 minutes between kills

# Handle Ctrl+C gracefully
[Console]::TreatControlCAsInput = $false
[Console]::CancelKeyPress.Add_EventHandler({
    param($sender, $e)
    $e.Cancel = $true
    $script:running = $false
    Write-Host "`n[Memory Monitor] Shutting down..." -ForegroundColor Yellow
})

function Get-MemoryUsage {
    $totalMem = (Get-CimInstance -ClassName Win32_ComputerSystem).TotalVisibleMemorySize
    $freeMem = (Get-CimInstance -ClassName Win32_OperatingSystem).FreePhysicalMemory
    $usedMem = $totalMem - $freeMem
    $percentUsed = [math]::Round(($usedMem / $totalMem) * 100, 1)
    return @{
        TotalGB = [math]::Round($totalMem / 1MB, 1)
        UsedGB = [math]::Round($usedMem / 1MB, 1)
        FreeGB = [math]::Round($freeMem / 1MB, 1)
        Percent = $percentUsed
    }
}

function Get-TopProcesses {
    param($Count = 10)
    Get-Process | Where-Object { $_.WorkingSet -gt 10MB } | 
        Sort-Object -Descending WorkingSet | 
        Select-Object -First $Count | 
        Format-Table -AutoSize Name, Id, @{Name='GB';Expression={[math]::round($_.WorkingSet/1GB,2)}}
}

function Kill-HighMemoryProcesses {
    param($thresholdPercent)
    
    $currentTime = Get-Date
    if ($currentTime - $script:lastKillTime).TotalSeconds -lt $script:minKillInterval {
        Write-Host "[Memory Monitor] Last kill was too recent, skipping..." -ForegroundColor Yellow
        return $false
    }

    $memory = Get-MemoryUsage
    if ($memory.Percent -lt $thresholdPercent) {
        Write-Host "[Memory Monitor] Memory usage $($memory.Percent)% is below threshold $thresholdPercent%" -ForegroundColor Green
        return $false
    }

    Write-Host "[Memory Monitor] Memory usage $($memory.Percent)% exceeds threshold $thresholdPercent%, killing processes..." -ForegroundColor Red
    
    # Target high-memory processes, excluding safe ones
    $killTargets = Get-Process | 
        Where-Object { 
            $_.WorkingSet -gt 100MB -and 
            $SafeProcesses -notcontains $_.Name 
        } | 
        Sort-Object -Descending WorkingSet | 
        Select-Object -First 5

    if ($killTargets) {
        foreach ($proc in $killTargets) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Write-Host "  Killed: $($proc.Name) ($([math]::round($proc.WorkingSet/1GB,2))GB)" -ForegroundColor Gray
            } catch {
                Write-Host "  Failed to kill: $($proc.Name)" -ForegroundColor Red
            }
        }
        $script:lastKillTime = $currentTime
        return $true
    } else {
        Write-Host "  No suitable processes to kill" -ForegroundColor Yellow
        return $false
    }
}

Write-Host "=== Memory Monitor Started ===" -ForegroundColor Cyan
Write-Host "Kill Threshold: $($KillThreshold)% (0 = monitor only)" -ForegroundColor Cyan
Write-Host "Check Interval: $CheckInterval seconds" -ForegroundColor Cyan
Write-Host "Safe Processes: $($SafeProcesses -join ', ')" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Cyan
Write-Host ""

while ($script:running) {
    $memory = Get-MemoryUsage
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    Write-Host "[$timestamp] Memory: $($memory.Percent)% used ($($memory.UsedGB)GB/$($memory.TotalGB)GB)" -ForegroundColor $(if ($memory.Percent -gt 85) { "Red" } elseif ($memory.Percent -gt 70) { "Yellow" } else { "Green" })
    
    if ($KillThreshold -gt 0 -and $memory.Percent -gt $KillThreshold) {
        $killed = Kill-HighMemoryProcesses -thresholdPercent $KillThreshold
        if ($killed) {
            $memory = Get-MemoryUsage  # Refresh after kills
            Write-Host "[$timestamp] After kill: $($memory.Percent)% used ($($memory.UsedGB)GB/$($memory.TotalGB)GB)" -ForegroundColor Green
        }
    }
    
    if ($Verbose) {
        Write-Host "Top processes:"
        Get-TopProcesses -Count $TopN
        Write-Host ""
    }
    
    Start-Sleep -Seconds $CheckInterval
}

Write-Host "=== Memory Monitor Stopped ===" -ForegroundColor Cyan