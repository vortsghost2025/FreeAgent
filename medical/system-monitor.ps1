# System Resource Monitor
# Gentle monitoring without stressing your system

Write-Host "📊 System Resource Monitor" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# CPU Information
Write-Host "🖥️  CPU Information:" -ForegroundColor Yellow
$cpu = Get-CimInstance Win32_Processor
Write-Host "  Model: $($cpu.Name)"
Write-Host "  Cores: $($cpu.NumberOfCores) physical, $($cpu.NumberOfLogicalProcessors) logical"
Write-Host "  Max Speed: $($cpu.MaxClockSpeed) MHz"
Write-Host "  Current Load: $($cpu.LoadPercentage)%"
Write-Host ""

# Memory Information
Write-Host "💾 Memory Information:" -ForegroundColor Yellow
$os = Get-CimInstance Win32_OperatingSystem
$totalMem = [math]::Round($os.TotalVisibleMemorySize/1024/1024, 2)
$freeMem = [math]::Round($os.FreePhysicalMemory/1024/1024, 2)
$usedMem = $totalMem - $freeMem
$memPercent = [math]::Round(($usedMem/$totalMem)*100, 1)

Write-Host "  Total: $totalMem GB"
Write-Host "  Used: $usedMem GB ($memPercent%)"
Write-Host "  Free: $freeMem GB"
Write-Host ""

# Storage Information
Write-Host "💿 Storage Information:" -ForegroundColor Yellow
$volumes = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } # Fixed drives only

foreach ($volume in $volumes) {
    $size = [math]::Round($volume.Size/1GB, 2)
    $free = [math]::Round($volume.FreeSpace/1GB, 2)
    $used = $size - $free
    $percent = [math]::Round(($used/$size)*100, 1)
    
    Write-Host "  Drive $($volume.DeviceID): $size GB total, $used GB used ($percent%), $free GB free"
}

Write-Host ""

# Process Information (top memory users)
Write-Host "📈 Top Memory-Using Processes:" -ForegroundColor Yellow
$topProcesses = Get-Process | Sort-Object WS -Descending | Select-Object -First 5 | 
                Select-Object ProcessName, @{Name="MemoryMB";Expression={[math]::Round($_.WS/1MB, 1)}}, CPU

$topProcesses | Format-Table -AutoSize

Write-Host ""

# Recommendations
Write-Host "💡 System Recommendations:" -ForegroundColor Green
if ($freeMem -lt 2.0) {
    Write-Host "  ⚠️  Low memory - Consider closing unused applications"
}
if ($cpu.LoadPercentage -gt 70) {
    Write-Host "  ⚠️  High CPU usage - System may be under heavy load"
}
if ($freeMem -gt 4.0 -and $cpu.LoadPercentage -lt 50) {
    Write-Host "  ✅ System resources appear healthy for cleanup operations"
}

Write-Host ""
Write-Host "✨ Monitoring complete!" -ForegroundColor Green