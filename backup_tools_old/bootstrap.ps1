Write-Host "🧠 Bootstrapping FreeAgent System..."

# Kill old node processes
taskkill /F /IM node.exe 2>$null

# Start cockpit
Write-Host "🎛️ Starting Cockpit..."
Start-Process powershell -ArgumentList "cd S:\workspace\cockpit; node server.js" -WindowStyle Minimized

# Start agents (Kilo 2.0 placeholder)
Write-Host "🤖 Starting Agents..."
Start-Process powershell -ArgumentList "cd S:\workspace\agents; node kilo.js" -WindowStyle Minimized

# Start local model server (optional)
Write-Host "🧩 Starting Local Model Server..."
Start-Process powershell -ArgumentList "cd S:\workspace\models; node local-model.js" -WindowStyle Minimized

Write-Host "🚀 FreeAgent System Online"
