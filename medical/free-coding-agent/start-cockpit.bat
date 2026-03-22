@echo off
REM ========================================
REM Kilo Code - Clean Restart Script
REM ========================================
REM 
REM This script provides a complete clean restart:
REM   1. Kills all Chrome and Node processes
REM   2. Clears temporary/log files
REM   3. Starts Chrome with remote debugging
REM   4. Launches cockpit server
REM   5. Opens cockpit in browser
REM
REM Usage: Double-click to run
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Kilo Code - Clean Restart
echo ========================================
echo.

REM ========================================
REM Step 1: Kill Chrome processes
REM ========================================
echo [1/6] Killing Chrome processes...
taskkill /F /IM chrome.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo     ✓ Chrome terminated
) else (
    echo     ✓ No Chrome running
)

REM ========================================
REM Step 2: Kill Node processes (carefully)
REM ========================================
echo [2/6] Killing Node processes on common ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000" ^| findstr "LISTENING"') do (
    echo     Killing PID %%a on port 4000
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4001" ^| findstr "LISTENING"') do (
    echo     Killing PID %%a on port 4001
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo     Killing PID %%a on port 3000
    taskkill /F /PID %%a 2>nul
)

REM ========================================
REM Step 3: Clear temp files (optional)
REM ========================================
echo [3/6] Clearing temporary files...
if exist "temp\" (
    del /q temp\* 2>nul
    echo     ✓ Temp folder cleared
)
if exist "logs\" (
    del /q logs\* 2>nul
    echo     ✓ Logs folder cleared
)

REM ========================================
REM Step 4: Wait for ports to release
REM ========================================
echo [4/6] Waiting for ports to release...
timeout /t 2 /nobreak >nul

REM ========================================
REM Step 5: Start Chrome with remote debugging
REM ========================================
echo [5/6] Starting Chrome with remote debugging (port 9222)...
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug"
echo     ✓ Chrome started on port 9222

REM ========================================
REM Step 6: Start cockpit server
REM ========================================
echo [6/6] Starting cockpit server...
start "Kilo Cockpit" cmd /k "npm run cockpit"

REM ========================================
REM Wait and open browser
REM ========================================
echo.
echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Clean Restart Complete!
echo ========================================
echo.
echo   Chrome:     http://localhost:9222 (DevTools)
echo   Cockpit:    http://localhost:3000/monaco-cockpit.html
echo   With Agent: http://localhost:3000/monaco-cockpit.html?agent=claw
echo.
echo   Kilo Code can now use browser automation!
echo ========================================
echo.
echo Opening cockpit in Chrome...
start http://localhost:3000/monaco-cockpit.html

echo.
pause
