# start-services.ps1 - Start backend services
Start-Process powershell -ArgumentList "-NoExit", "node .\server.js" -WindowStyle Normal -WorkingDirectory .
Write-Host "✅ Backend services started (port 3001)"
