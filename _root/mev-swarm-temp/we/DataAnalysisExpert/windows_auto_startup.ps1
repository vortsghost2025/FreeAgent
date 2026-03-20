# windows_auto_startup.ps1
# Creates a Windows Task Scheduler task to run MEV data collector at system startup
# Works without requiring user login (runs as SYSTEM)

param(
    [string]$TaskName = "MEVDataCollector",
    [string]$CollectorScript = "mev-data-collector.cjs"
)

# Get the directory where this script is located (should be DataAnalysisExpert)
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}

# The collector script should be in the parent directory (workspace root)
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$CollectorPath = Join-Path $WorkspaceRoot $CollectorScript

# Find node.exe
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodePath) {
    # Try common locations if node is not in PATH
    $CommonPaths = @(
        "${env:ProgramFiles}\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:AppData\npm\node.exe"
    )
    foreach ($path in $CommonPaths) {
        if (Test-Path $path) {
            $NodePath = $path
            break
        }
    }
}

if (-not $NodePath) {
    Write-Host "ERROR: node.exe not found. Please ensure Node.js is installed." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $CollectorPath)) {
    Write-Host "ERROR: Collector script not found at: $CollectorPath" -ForegroundColor Red
    exit 1
}

Write-Host "=== MEV Data Collector - Windows Task Scheduler Setup ===" -ForegroundColor Cyan
Write-Host "Task Name: $TaskName"
Write-Host "Node Path: $NodePath"
Write-Host "Collector: $CollectorPath"
Write-Host ""

# Cleanup: Remove existing task if present
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Existing task removed." -ForegroundColor Green
}

# Create the action - run node with the collector script
$Action = New-ScheduledTaskAction -Execute $NodePath -Argument $CollectorPath -WorkingDirectory $WorkspaceRoot

# Create the trigger - run at system startup
$Trigger = New-ScheduledTaskTrigger -AtStartup

# Create the principal - run as SYSTEM (no user login required)
# This allows the task to run even when no user is logged in
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Create settings - allow wake to run, start only when idle is false
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false

# Register the task
Write-Host "Creating scheduled task..." -ForegroundColor Yellow
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description "MEV Data Collector - Runs at system startup to collect blockchain data" | Out-Null

Write-Host ""
Write-Host "=== Task Created Successfully ===" -ForegroundColor Green
Write-Host ""
Write-Host "The MEV Data Collector will now run automatically at system startup."
Write-Host "You can verify the task in Task Scheduler (taskschd.msc) or run:"
Write-Host "  Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
Write-Host ""
Write-Host "To remove the scheduled task, run:"
Write-Host "  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
Write-Host ""
