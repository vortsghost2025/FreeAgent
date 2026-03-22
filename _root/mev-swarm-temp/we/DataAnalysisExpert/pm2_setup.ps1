# PM2 setup for Windows - mev-data-collector
# Run this in an elevated PowerShell (Run as Administrator)

# 1) Ensure Node/npm is available
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js not found in PATH. Install Node.js (LTS) first: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 2) Install pm2 globally
Write-Host "Installing pm2 globally..." -ForegroundColor Cyan
npm install -g pm2 --no-fund --no-audit

# 3) Start the collector with pm2 (from repo root)
# Adjust the path if you keep the collector elsewhere.
$collectorPath = "mev-data-collector.cjs"
if (-Not (Test-Path $collectorPath)) {
    Write-Host "Collector file not found at $collectorPath. Run this script from the repository root where mev-data-collector.cjs lives." -ForegroundColor Red
    exit 1
}

Write-Host "Starting mev-data-collector with PM2..." -ForegroundColor Cyan
pm2 start $collectorPath --name mev-collector --merge-logs --no-autorestart=false

# 4) Persist the process list so pm2 resurrects after reboot
Write-Host "Saving pm2 process list..." -ForegroundColor Cyan
pm2 save
# 5) Generate a startup script. On Windows this requires admin privileges.
Write-Host "Generating system startup command (requires admin). If this fails, run 'pm2 startup' manually in an elevated PowerShell." -ForegroundColor Cyan
pm2 startup | Out-Host

Write-Host "Done. To finalize startup registration, copy & run the command printed above in an elevated PowerShell." -ForegroundColor Green

nWrite-Host "To view logs: pm2 logs mev-collector" -ForegroundColor Green
nWrite-Host "To stop: pm2 stop mev-collector && pm2 delete mev-collector" -ForegroundColor Green