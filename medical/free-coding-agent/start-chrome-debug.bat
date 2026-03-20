@echo off
REM ========================================
REM Kilo Code - Chrome Debug Launcher
REM ========================================
REM
REM This launches Chrome with remote debugging enabled for Kilo Code's browser automation.
REM IMPORTANT: Chrome must be running with --remote-debugging-port=9222 for Kilo to connect.
REM
REM Usage: Double-click this file
REM ========================================

set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "USER_DATA_DIR=C:\ChromeDebug"

REM Check if Chrome exists in default location
if not exist "%CHROME_PATH%" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

REM Check again
if not exist "%CHROME_PATH%" (
    echo ERROR: Chrome not found!
    echo Please install Google Chrome or update the path in this script.
    pause
    exit /b 1
)

echo Starting Chrome with remote debugging...
echo.

REM Launch Chrome with debugging port and clean user data directory
start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%USER_DATA_DIR%" --no-first-run --no-default-browser-check

echo Chrome launched with:
echo   - Remote debugging port: 9222
echo   - User data directory: %USER_DATA_DIR%
echo.
echo Kilo Code should now detect Chrome.
echo.
echo To verify Chrome is running correctly, visit:
echo   http://localhost:9222/json/version
echo.
echo Press any key to open the cockpit...
pause >nul

start http://localhost:3000/monaco-cockpit.html
