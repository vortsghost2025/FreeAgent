# start-cockpit.ps1 - Start cockpit UI
Start-Process powershell -ArgumentList "-NoExit", "node .\cockpit\server.js" -WindowStyle Normal -WorkingDirectory .
Write-Host "✅ Cockpit started (port 4000)"
