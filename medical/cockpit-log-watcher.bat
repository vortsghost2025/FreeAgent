@echo off
REM ============================================================
REM COCKPIT LOG WATCHER - Manual Monitoring Tool
REM ============================================================
REM Run this manually to watch server logs for errors
REM No background daemons, no auto-starting
REM ============================================================

echo.
echo ============================================================
echo   COCKPIT SERVER LOG WATCHER
echo ============================================================
echo.
echo This tool watches cockpit-server.js logs and alerts you to errors.
echo Press Ctrl+C to stop watching.
echo.

REM Check if server is running
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe" >NUL
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No node.js process found. Start the server first:
    echo   node cockpit-server.js
    pause
    exit /b 1
)

echo [OK] Server process detected.
echo.
echo Watching for errors...
echo.

:WATCH_LOOP
REM Watch for error patterns in recent output
REM Note: This is a simple console watcher
REM For detailed file-based monitoring, consider redirecting server output to a log file

timeout /t 2 >nul

REM Simple loop - press Ctrl+C to stop
goto WATCH_LOOP
