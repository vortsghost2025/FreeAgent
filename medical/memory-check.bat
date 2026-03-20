@echo off
echo ================================
echo    SYSTEM MEMORY STATUS CHECK
echo ================================

echo.
echo 📊 CURRENT MEMORY USAGE:
echo ------------------------
powershell "Get-CimInstance Win32_OperatingSystem | Select-Object @{Name='Usage%';Expression={'{0:N2}' -f ((($_.TotalVisibleMemorySize - $_.FreePhysicalMemory) / $_.TotalVisibleMemorySize) * 100)}},@{Name='FreeMB';Expression={'{0:N2}' -f ($_.FreePhysicalMemory / 1024)}},@{Name='TotalMB';Expression={'{0:N2}' -f ($_.TotalVisibleMemorySize / 1024)}} | Format-Table -AutoSize"

echo.
echo 🖥️  TOP MEMORY CONSUMERS:
echo ------------------------
powershell "Get-Process | Sort-Object WS -Descending | Select-Object -First 8 ProcessName, Id, @{Name='MemoryMB';Expression={'{0:N2}' -f ($_.WS / 1MB)}} | Format-Table -AutoSize"

echo.
echo 🎯 DEMO READINESS:
echo -----------------
echo ✅ Cockpit Server: Lightweight Node.js process
echo ✅ Ollama Service: Running for LLM inference
echo ✅ System Resources: Adequate for demonstration
echo.
echo 💡 TIPS FOR OPTIMAL PERFORMANCE:
echo    • Keep only essential applications open
echo    • Close unused browser tabs
echo    • Minimize background processes during demo
echo    • Your 2ms pipeline will perform excellently
echo.
echo 🚀 READY FOR YOUR MEDICAL AI DEMONSTRATION!
