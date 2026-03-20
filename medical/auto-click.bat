@echo off
echo 🤖 AUTO-CLICK SCRIPT ACTIVATED
echo Keeps system responsive during endurance testing
echo Press Ctrl+C to stop

:loop
echo [%time%] Clicking to maintain system activity...
REM Send mouse click (left button)
powershell -command "[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')"
timeout /t 30 /nobreak >nul
goto loop