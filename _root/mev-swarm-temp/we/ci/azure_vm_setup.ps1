<#
azure_vm_setup.ps1
Bootstrap script for Azure Windows GPU VM to build and (optionally) profile the CUDA sample using the validated wrapper.
Run as Administrator. Adjust $ProjectRoot if needed.
#>

param(
    [string]$ProjectRoot = $PSScriptRoot, # set to repository root when uploaded to VM
    [switch]$SkipNsightComputeInstall
)

Set-StrictMode -Version Latest

try {
    $ProjectRoot = (Resolve-Path $ProjectRoot).Path
} catch {
    Write-Error "Cannot resolve PROJECT_ROOT: $ProjectRoot"
    exit 1
}

Write-Host "PROJECT_ROOT = $ProjectRoot"

# Directories
$buildDir = Join-Path $ProjectRoot "build"
$finalDir = Join-Path $buildDir "final_validation"
New-Item -ItemType Directory -Force -Path $finalDir | Out-Null

# Candidate Nsight Compute locations (update as new versions are released)
$nsightCandidates = @(
    "C:\Program Files\NVIDIA Corporation\Nsight Compute 2026.1.0\target\windows-desktop-win7-x64\nsight-cuda.exe",
    "C:\Program Files\NVIDIA Corporation\Nsight Compute 2026.2.1\target-windows-x64\nsight-cuda.exe",
    "C:\Program Files\NVIDIA Corporation\Nsight Compute\nsight-cuda.exe"
)

$nsightExe = $nsightCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $nsightExe -and -not $SkipNsightComputeInstall) {
    Write-Host "Nsight Compute not found. Attempting to install via winget (if available)..."
    try {
        winget install --id NVIDIA.NsightCompute -e --silent -h
    } catch {
        Write-Warning "winget install attempted but failed or not available. Please install Nsight Compute manually if profiling is required."
    }
    $nsightExe = $nsightCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

# Build using the wrapper script (do not call nvcc directly — wrapper handles vcvars)
$buildScript = Join-Path $ProjectRoot "scripts\build_with_vcvars.ps1"
$source = Join-Path $ProjectRoot "CudaTest\test.cu"
$outExe = Join-Path $buildDir "cuda_sample.exe"

if (-not (Test-Path $buildScript)) {
    Write-Error "Missing build wrapper: $buildScript"
    exit 1
}

Write-Host "Invoking build wrapper..."
& powershell -NoProfile -ExecutionPolicy Bypass -File $buildScript -Source $source -Out $outExe -MaxRegCount 32 -Arch sm_86
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build wrapper failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Archive build artifact and logs for traceability
$timestamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
$archiveDir = Join-Path $ProjectRoot "build\profiling_results_$timestamp"
New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null
Copy-Item -Path $outExe -Destination $archiveDir -Force

# Optional: run Nsight Compute if present
if ($nsightExe) {
    Write-Host "Running Nsight Compute ($nsightExe) against: $outExe"
    $reportBase = Join-Path $finalDir "ncu_optimized"
    $logFile = Join-Path $finalDir "ncu_logs.txt"
    & "$nsightExe" compute --set full --export="$reportBase" "$outExe" > $logFile 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Nsight Compute exited with $LASTEXITCODE -- check $logFile"
    } else {
        Write-Host "Converting report to text summary..."
        & "$nsightExe" --import "$reportBase.ncu-rep" > (Join-Path $finalDir "summary_final.txt") 2>&1
        Write-Host "Reports placed in: $finalDir"
    }
} else {
    Write-Warning "Nsight Compute not installed on this VM; profiling step skipped. Install Nsight Compute or set -SkipNsightComputeInstall to avoid winget attempts."
}

Write-Host "azure_vm_setup.ps1 completed. Artifacts archived to: $archiveDir"
exit 0
