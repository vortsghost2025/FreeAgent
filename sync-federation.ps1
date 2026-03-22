param(
    [Parameter(Mandatory=$true)]
    [string[]]$Files,
    
    [switch]$Backup
)

# Function to write colored output
function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$true)]
        [string]$Color
    )
    
    switch ($Color) {
        "Green" { Write-Host $Message -ForegroundColor Green }
        "Red" { Write-Host $Message -ForegroundColor Red }
        "Yellow" { Write-Host $Message -ForegroundColor Yellow }
        "Cyan" { Write-Host $Message -ForegroundColor Cyan }
        "Magenta" { Write-Host $Message -ForegroundColor Magenta }
        default { Write-Host $Message }
    }
}

# Initialize counters
$successCount = 0
$failCount = 0

# Define target paths
$targetPath = "C:\inetpub\wwwroot"
$backupPath = "C:\backup\federation"

# Create directories if they don't exist
if (-not (Test-Path $targetPath)) {
    New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    Write-ColorOutput "Created directory: $targetPath" "Cyan"
}

if ($Backup) {
    if (-not (Test-Path $backupPath)) {
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        Write-ColorOutput "Created backup directory: $backupPath" "Cyan"
    }
}

# Process each file
foreach ($file in $Files) {
    $sourceFile = Join-Path $PSScriptRoot $file
    $targetFile = Join-Path $targetPath $file
    
    # Check if source file exists
    if (-not (Test-Path $sourceFile)) {
        Write-ColorOutput "❌ Source file not found: $sourceFile" "Red"
        $failCount++
        continue
    }
    
    try {
        # Copy file to IIS
        Copy-Item $sourceFile $targetFile -Force
        Write-ColorOutput "✅ Copied: $file" "Green"
        $successCount++
        
        # Copy to backup if specified
        if ($Backup) {
            $backupFile = Join-Path $backupPath $file
            Copy-Item $sourceFile $backupFile -Force
            Write-ColorOutput "📁 Backed up: $file" "Yellow"
        }
    }
    catch {
        Write-ColorOutput "❌ Failed to copy: $file" "Red"
        Write-ColorOutput "Error: $_" "Red"
        $failCount++
    }
}

# Summary
Write-ColorOutput "🚀 Sync operation completed!" "Cyan"
Write-ColorOutput "📊 Success: $successCount files" "Green"
Write-ColorOutput "❌ Failed: $failCount files" "Red"

if ($successCount -gt 0) {
    Write-ColorOutput "🎉 Federation upgrade ready to deploy!" "Magenta"
}
else {
    Write-ColorOutput "⚠️ No files successfully copied. Check your configuration." "Yellow"
}

# Return exit code based on success/failure
if ($failCount -eq 0) {
    exit 0
}
else {
    exit 1
}