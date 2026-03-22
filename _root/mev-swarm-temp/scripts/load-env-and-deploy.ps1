# Load .env.local into this PowerShell session and run safe deploy
# Usage: pwsh -NoProfile -File .\scripts\load-env-and-deploy.ps1

$envFile = Join-Path $PSScriptRoot '..\.env.local' -Resolve
if (-not (Test-Path $envFile)) {
    Write-Error ".env.local not found at $envFile"
    exit 1
}

Write-Host "Loading variables from $envFile"
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $val  = $matches[2].Trim()
        Set-Item -Path Env:$name -Value $val
    }
}

# Show non-sensitive confirmation to user
if ($env:GOERLI_RPC_URL) { Write-Host "GOERLI_RPC_URL set (length: $($env:GOERLI_RPC_URL.Length))" } else { Write-Host "GOERLI_RPC_URL not set" }
if ($env:ETHEREUM_RPC_URL) { Write-Host "ETHEREUM_RPC_URL set (length: $($env:ETHEREUM_RPC_URL.Length))" }
if ($env:PRIVATE_KEY) { $pk = $env:PRIVATE_KEY; $masked = ($pk.Substring(0,[Math]::Min(6,$pk.Length))) + '...' + ($pk.Substring([Math]::Max(0,$pk.Length-4))); Write-Host "PRIVATE_KEY set (masked): $masked" } else { Write-Host "PRIVATE_KEY not set" }

Write-Host "Running env validation..."
npm run check-env:ps1
if ($LASTEXITCODE -ne 0) { Write-Error "Env validation failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE }

Write-Host "Running safe deploy (this may take a few minutes)..."
npm run deploy:goerli-safe
exit $LASTEXITCODE
