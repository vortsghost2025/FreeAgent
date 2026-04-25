<#
.SYNOPSIS
    Heartbeat Speaker - Audio feedback for SNAC Orchestrator task completion
    
.DESCRIPTION
    Monitors for task_complete.flag file in the eval directory and plays 
    a system beep when tasks complete. Runs in background to give audio 
    feedback without watching the dashboard.
    
.PARAMETER EvalPath
    Path to the eval directory to monitor (default: ./we/eval)
    
.PARAMETER FlagFile
    Name of the flag file to watch (default: task_complete.flag)
    
.PARAMETER IntervalMs
    Polling interval in milliseconds (default: 1000)
    
.EXAMPLE
    .\heartbeat.ps1
    
.EXAMPLE
    .\heartbeat.ps1 -EvalPath "C:\projects\snac\we\eval" -IntervalMs 500

.NOTES
    Run in background: Start-Process powershell -ArgumentList "-File", $PSCommandPath
#>

param(
    [string]$EvalPath = "./eval",
    [string]$FlagFile = "task_complete.flag",
    [int]$IntervalMs = 1000
)

# Make path absolute if relative
if (-not [System.IO.Path]::IsPathRooted($EvalPath)) {
    $EvalPath = Join-Path (Get-Location) $EvalPath
}

$FlagFilePath = Join-Path $EvalPath $FlagFile
$LastProcessedTime = [DateTime]::MinValue

# Console colors
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

function Play-Beep {
    <#
    .SYNOPSIS
        Play system beep with variation based on success/failure
    #>
    param(
        [bool]$Success = $true
    )
    
    try {
        if ($Success) {
            # Happy beep sequence for success
            [Console]::Beep(880, 150)    # A5
            Start-Sleep -Milliseconds 50
            [Console]::Beep(1108, 150)  # C#6
            Start-Sleep -Milliseconds 50
            [Console]::Beep(1318, 200)  # E6
        } else {
            # Sad beep for failure
            [Console]::Beep(200, 300)
            Start-Sleep -Milliseconds 100
            [Console]::Beep(150, 400)
        }
    }
    catch {
        # Fallback if beep fails
        Write-Host "🔔" -ForegroundColor $SuccessColor -NoNewline
    }
}

function Write-HeartbeatLog {
    param(
        [string]$Message,
        [string]$Color = $InfoColor
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

function Get-FlagContent {
    <#
    .SYNOPSIS
        Read the flag file and return its content
    #>
    if (Test-Path $FlagFilePath) {
        try {
            $content = Get-Content $FlagFilePath -Raw -ErrorAction SilentlyContinue
            return $content
        }
        catch {
            return $null
        }
    }
    return $null
}

# Banner
Write-Host ""
Write-Host "🎵 HEARTBEAT SPEAKER - SNAC Orchestrator Audio Feedback" -ForegroundColor $InfoColor
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host ""
Write-HeartbeatLog "Monitoring: $FlagFilePath"
Write-HeartbeatLog "Polling interval: $IntervalMs ms"
Write-HeartbeatLog "Press Ctrl+C to stop"
Write-Host ""

# Main monitoring loop
$running = $true
$ctrlCHandler = {
    $script:running = $false
    Write-Host ""
    Write-HeartbeatLog "🛑 Heartbeat Speaker stopped" $WarningColor
    exit 0
}

# Register Ctrl+C handler
[Console]::TreatControlCAsInput = $false
$null = [Console]::TreatControlCAsInput

try {
    while ($running) {
        # Check for Ctrl+C
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if (($key.Modifiers -eq [ConsoleModifiers]::Control) -and ($key.Key -eq [ConsoleKey]::C)) {
                Write-Host ""
                Write-HeartbeatLog "🛑 Heartbeat Speaker stopped" $WarningColor
                break
            }
        }
        
        # Check if flag file exists
        if (Test-Path $FlagFilePath) {
            $fileInfo = Get-Item $FlagFilePath -ErrorAction SilentlyContinue
            
            if ($fileInfo) {
                # Check if file is newer than last processed
                if ($fileInfo.LastWriteTime -gt $LastProcessedTime) {
                    $LastProcessedTime = $fileInfo.LastWriteTime
                    
                    # Read flag content
                    $content = Get-FlagContent
                    
                    if ($content) {
                        # Parse the flag file
                        $lines = $content -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }
                        
                        # Determine if success or failure
                        $isSuccess = $true
                        $taskName = "Task"
                        
                        foreach ($line in $lines) {
                            if ($line -match "^status[:=]\s*(\w+)") {
                                $status = $Matches[1].ToLower()
                                if ($status -eq "failed" -or $status -eq "error") {
                                    $isSuccess = $false
                                }
                            }
                            elseif ($line -match "^task[:=]\s*(.+)") {
                                $taskName = $Matches[1]
                            }
                        }
                        
                        # Play appropriate beep
                        Play-Beep -Success $isSuccess
                        
                        # Log the event
                        if ($isSuccess) {
                            Write-HeartbeatLog "✅ Task completed: $taskName" $SuccessColor
                        }
                        else {
                            Write-HeartbeatLog "❌ Task failed: $taskName" "Red"
                        }
                        
                        # Delete the flag file after processing
                        try {
                            Remove-Item $FlagFilePath -Force -ErrorAction SilentlyContinue
                        }
                        catch {
                            # File might be locked, ignore
                        }
                    }
                    else {
                        # Empty flag file - treat as success
                        Play-Beep -Success $true
                        Write-HeartbeatLog "✅ Task completed" $SuccessColor
                        
                        try {
                            Remove-Item $FlagFilePath -Force -ErrorAction SilentlyContinue
                        }
                        catch {
                            # Ignore
                        }
                    }
                }
            }
        }
        
        # Wait before next check
        Start-Sleep -Milliseconds $IntervalMs
    }
}
catch {
    Write-HeartbeatLog "⚠️ Error: $_" "Red"
}
finally {
    Write-Host ""
    Write-HeartbeatLog "Heartbeat Speaker shutdown complete" $InfoColor
}
