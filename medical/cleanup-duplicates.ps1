# Duplicate File Cleanup Script for sharedClientCache
# Run this script to clean up duplicate files in C:\autonomous-elasticsearch-evolution-agent\sharedClientCache

param(
    [string]$TargetPath = "C:\autonomous-elasticsearch-evolution-agent\sharedClientCache",
    [switch]$WhatIf = $false,
    [switch]$Force = $false
)

Write-Host "🔍 Analyzing duplicate files in: $TargetPath" -ForegroundColor Cyan
Write-Host ""

# Check if target path exists
if (-not (Test-Path $TargetPath)) {
    Write-Error "Target path does not exist: $TargetPath"
    exit 1
}

# Function to get file hash for comparison
function Get-FileHashSafe {
    param([string]$FilePath)
    try {
        return (Get-FileHash $FilePath -Algorithm SHA256).Hash
    } catch {
        return $null
    }
}

# Find all files in the cache
Write-Host "📂 Scanning for files..." -ForegroundColor Yellow
$allFiles = Get-ChildItem -Path $TargetPath -Recurse -File | Where-Object {
    $_.FullName -notlike "*\node_modules\*" -and
    $_.FullName -notlike "*\.git\*" -and
    $_.Length -gt 0
}

Write-Host "Found $($allFiles.Count) files to analyze" -ForegroundColor Green

# Group files by name pattern and identify duplicates
Write-Host "🔍 Identifying duplicates..." -ForegroundColor Yellow

$duplicateGroups = @{}
$fileInfo = @{}

# Process each file
foreach ($file in $allFiles) {
    $fileName = $file.Name
    
    # Store file info with hash
    $hash = Get-FileHashSafe $file.FullName
    $fileInfo[$file.FullName] = @{
        Path = $file.FullName
        Name = $fileName
        Size = $file.Length
        Hash = $hash
        LastWriteTime = $file.LastWriteTime
    }
    
    # Group by filename pattern (before UUID)
    if ($fileName -match '^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})__(.+)$') {
        $baseName = $matches[2]
        if (-not $duplicateGroups.ContainsKey($baseName)) {
            $duplicateGroups[$baseName] = @()
        }
        $duplicateGroups[$baseName] += $file.FullName
    }
}

# Identify actual duplicates (same content)
$duplicatesToRemove = @()

foreach ($group in $duplicateGroups.GetEnumerator()) {
    $filesInGroup = $group.Value
    
    if ($filesInGroup.Count -gt 1) {
        Write-Host "📝 Found $($filesInGroup.Count) versions of '$($group.Key)':"
        
        # Group by hash to find actual duplicates
        $hashGroups = @{}
        foreach ($filePath in $filesInGroup) {
            $info = $fileInfo[$filePath]
            if ($info.Hash) {
                if (-not $hashGroups.ContainsKey($info.Hash)) {
                    $hashGroups[$info.Hash] = @()
                }
                $hashGroups[$info.Hash] += $filePath
            }
        }
        
        # For each hash group with multiple files, keep the newest, mark others for deletion
        foreach ($hashGroup in $hashGroups.Values) {
            if ($hashGroup.Count -gt 1) {
                # Sort by last write time, keep the newest
                $sortedFiles = $hashGroup | Sort-Object { $fileInfo[$_].LastWriteTime } -Descending
                $filesToDelete = $sortedFiles | Select-Object -Skip 1
                
                foreach ($fileToDelete in $filesToDelete) {
                    $duplicatesToRemove += @{
                        Path = $fileToDelete
                        Reason = "Duplicate content (keep newest)"
                        Original = $sortedFiles[0]
                    }
                    Write-Host "  ❌ $($fileInfo[$fileToDelete].Name) (older version)"
                }
            }
        }
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "Total files analyzed: $($allFiles.Count)"
Write-Host "Duplicate groups found: $($duplicateGroups.Count)"
Write-Host "Files marked for deletion: $($duplicatesToRemove.Count)"

if ($duplicatesToRemove.Count -eq 0) {
    Write-Host "✅ No duplicates found!" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "🗑️ Files to be deleted:" -ForegroundColor Red
$duplicatesToRemove | ForEach-Object {
    Write-Host "  $($_.Path)"
    Write-Host "    Reason: $($_.Reason)"
    if ($_.Original) {
        Write-Host "    Keeping: $($_.Original)"
    }
    Write-Host ""
}

if ($WhatIf) {
    Write-Host "🧪 WHAT IF MODE - No files will be deleted" -ForegroundColor Yellow
    exit 0
}

if (-not $Force) {
    $confirmation = Read-Host "Do you want to proceed with deletion? (yes/no)"
    if ($confirmation -ne "yes") {
        Write-Host "❌ Operation cancelled" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "🗑️ Deleting duplicate files..." -ForegroundColor Red

$deletedCount = 0
$errors = @()

foreach ($dup in $duplicatesToRemove) {
    try {
        if (Test-Path $dup.Path) {
            Remove-Item $dup.Path -Force
            Write-Host "✅ Deleted: $($dup.Path)" -ForegroundColor Green
            $deletedCount++
        }
    } catch {
        Write-Error "Failed to delete: $($dup.Path) - $($_.Exception.Message)"
        $errors += $dup.Path
    }
}

Write-Host ""
Write-Host "🏁 Cleanup Complete!" -ForegroundColor Cyan
Write-Host "Successfully deleted: $deletedCount files"
if ($errors.Count -gt 0) {
    Write-Host "Errors encountered: $($errors.Count) files"
    Write-Host "Failed files:"
    $errors | ForEach-Object { Write-Host "  $_" }
}

# Optional: Clean up empty directories
Write-Host ""
Write-Host "🧹 Cleaning up empty directories..." -ForegroundColor Yellow
Get-ChildItem -Path $TargetPath -Recurse -Directory | Where-Object {
    (Get-ChildItem $_.FullName -Force | Measure-Object).Count -eq 0
} | ForEach-Object {
    try {
        Remove-Item $_.FullName -Force
        Write-Host "Removed empty directory: $($_.FullName)"
    } catch {
        Write-Warning "Could not remove directory: $($_.FullName)"
    }
}
