@echo off
echo 🖱️ AUTO-MOUSE CLICK SCRIPT ACTIVATED
echo Sends mouse clicks to keep system active
echo Press Ctrl+C to stop

:loop
echo [%time%] Sending mouse click...
REM Send mouse click using PowerShell
powershell -command "
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(100, 100)
[System.Windows.Forms.SendKeys]::SendWait('{~}')
"
timeout /t 45 /nobreak >nul
goto loop