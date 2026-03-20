@echo off
REM Quick fix for WebSocket disconnection
REM Run this to re-establish connections

echo.
echo Fixing WebSocket connection...
echo.

REM Refresh the cockpit page
echo Refreshing cockpit...
start http://localhost:3000/monaco-cockpit.html

echo.
echo If still disconnected, run: start-cockpit.bat
echo.
pause
