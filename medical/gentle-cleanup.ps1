# Gentle Memory Cleanup Script
# Light touch approach for systems with limited resources

param(
    [string]$TargetPath = "C:\autonomous-elasticsearch-evolution-agent\sharedClientCache",
    [switch]$PreviewOnly = $true,
    [int]$BatchSize = 10,
    [int]$DelaySeconds = 2
)

Write-Host "🧘 Gentle Memory Cleanup - Light Touch Approach" -ForegroundColor Green
Write-Host "Target: $TargetPath" -ForegroundColor Cyan
Write-Host "Mode: $(if($PreviewOnly){'Preview Only'}else{'Active Cleanup'})" -ForegroundColor Yellow
Write-Host ""

# System resource check
$freeMem = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1024 / 1024
$cpuLoad = (Get-CimInstance Win32_Processor).LoadPercentage

Write-Host "📊 System Status:"
Write-Host "  Free Memory: $([math]::Round($freeMem, 1)) GB"
Write-Host "  CPU Load: $cpuLoad%"
Write-Host ""

if ($freeMem -lt 1.0) {
    Write-Warning "Low memory detected. Consider closing other applications."
    if (-not $PreviewOnly) {
        $continue = Read-Host "Continue anyway? (yes/no)"
        if ($continue -ne "yes") { exit }
    }
}

# Gentle file scanning with progress
Write-Host "🔍 Gently scanning files..." -ForegroundColor Yellow

$allFiles = @()
$processed = 0

try {
    $items = Get-ChildItem -Path $TargetPath -Recurse -File -ErrorAction SilentlyContinue | 
             Where-Object { $_.Length -gt 0 -and $_.FullName -notlike "*node_modules*" }
    
    $totalItems = $items.Count
    Write-Host "Found $totalItems files to process"
    
    foreach ($item in $items) {
        $processed++
        if ($processed % $BatchSize -eq 0) {
            Write-Progress -Activity "Scanning Files" -Status "Processed $processed of $totalItems" -PercentComplete (($processed/$totalItems)*100)
            Start-Sleep -Milliseconds ($DelaySeconds * 100) # Gentle pause
        }
        
        # Extract base name for grouping
        $fileName = $item.Name
        if ($fileName -match '^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})__(.+)$') {
            $baseName = $matches[2]
            $allFiles += [PSCustomObject]@{
                FullName = $item.FullName
                BaseName = $baseName
                Length = $item.Length
                LastWriteTime = $item.LastWriteTime
            }
        }
    }
    Write-Progress -Activity "Scanning Files" -Completed
}
catch {
    Write-Error "Error during file scanning: $($_.Exception.Message)"
    exit 1
}

Write-Host "✅ Scan complete. Found $($allFiles.Count) processable files" -ForegroundColor Green

# Gentle duplicate identification
Write-Host "🔍 Identifying duplicates gently..." -ForegroundColor Yellow

$groupedFiles = $allFiles | Group-Object BaseName | Where-Object { $_.Count -gt 1 }
Write-Host "Found $($groupedFiles.Count) duplicate groups"

$duplicatesToRemove = @()

foreach ($group in $groupedFiles) {
    $files = $group.Group | Sort-Object LastWriteTime -Descending
    # Keep the newest, mark others for removal
    $files | Select-Object -Skip 1 | ForEach-Object {
        $duplicatesToRemove += $_
    }
    
    if ($group.Count -gt 2) {
        Write-Host "  📝 $($group.Name): $($group.Count) versions (keeping newest)"
    }
}

Write-Host "📋 Summary:"
Write-Host "  Total files scanned: $($allFiles.Count)"
Write-Host "  Duplicate groups: $($groupedFiles.Count)"
Write-Host "  Files to remove: $($duplicatesToRemove.Count)"

if ($duplicatesToRemove.Count -eq 0) {
    Write-Host "✅ No duplicates found!" -ForegroundColor Green
    exit 0
}

# Preview mode
if ($PreviewOnly) {
    Write-Host ""
    Write-Host "👁️  PREVIEW MODE - These files would be removed:" -ForegroundColor Cyan
    $duplicatesToRemove | Select-Object FullName, @{Name="SizeKB";Expression={[math]::Round($_.Length/1KB, 1)}}, LastWriteTime | 
        Format-Table -AutoSize
    Write-Host "💡 Run with -PreviewOnly:`$false to actually delete files"
    exit 0
}

# Gentle deletion with confirmation
Write-Host ""
Write-Warning "🚨 ABOUT TO DELETE $($duplicatesToRemove.Count) FILES"
$confirmation = Read-Host "Type 'DELETE' to confirm"
if ($confirmation -ne "DELETE") {
    Write-Host "❌ Operation cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host "🗑️  Gently deleting files..." -ForegroundColor Red

$deletedCount = 0
$errors = @()

foreach ($file in $duplicatesToRemove) {
    try {
        # Gentle deletion with small delays
        Remove-Item $file.FullName -Force -ErrorAction Stop
        Write-Host "✅ Deleted: $($file.BaseName)"
        $deletedCount++
        
        # Very gentle pause between deletions
        if ($deletedCount % 3 -eq 0) {
            Start-Sleep -Milliseconds 500
        }
    }
    catch {
        Write-Error "Failed to delete: $($file.FullName)"
        $errors += $file.FullName
    }
}

Write-Host ""
Write-Host "🏁 Cleanup Complete!" -ForegroundColor Green
Write-Host "Successfully deleted: $deletedCount files"
if ($errors.Count -gt 0) {
    Write-Host "Errors: $($errors.Count) files"
}

# Gentle directory cleanup
Write-Host ""
Write-Host "🧹 Gently cleaning empty directories..." -ForegroundColor Yellow
$emptyDirs = Get-ChildItem -Path $TargetPath -Recurse -Directory -ErrorAction SilentlyContinue | 
             Where-Object { (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0 }

if ($emptyDirs) {
    Write-Host "Found $($emptyDirs.Count) empty directories"
    foreach ($dir in $emptyDirs) {
        try {
            Remove-Item $dir.FullName -Force
            Write-Host "Removed empty directory: $($dir.Name)"
        }
        catch {
            Write-Warning "Could not remove: $($dir.FullName)"
        }
        Start-Sleep -Milliseconds 100 # Gentle pause
    }
}

Write-Host "✨ Gentle cleanup finished!" -ForegroundColor Green
