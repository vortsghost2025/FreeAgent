<#
.SYNOPSIS
  Validate required environment variables for MEV Swarm execution.
.DESCRIPTION
  This script checks for ETHEREUM_RPC_URL and PRIVATE_KEY, and optionally other variables.
  It returns exit code 0 on success, 1 on failure.
.EXAMPLE
  .\scripts\validate-env.ps1
#>

$requiredVars = @(
    'ETHEREUM_RPC_URL',
    'PRIVATE_KEY'
)

$missing = @()
foreach ($var in $requiredVars) {
    $val = ${env:$var}
    if (-not $val -or $val -eq '') {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "[ERROR] Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missing) { Write-Host " - $var" }
    Write-Host "Set the missing variables or use scripts/set-private-key-env.* and rerun." -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Required environment variables are set." -ForegroundColor Green
exit 0
