@echo off
REM ========================================
REM Kilo Code - Complete Startup
REM ========================================
REM
REM This script starts your entire multi-agent cockpit:
REM   1. Kills stale processes
REM   2. Starts LM Studio (optional - for local inference)
REM   3. Starts Chrome with DevTools
REM   4. Starts cockpit backend
REM   5. Opens cockpit UI
REM
REM Usage: Double-click this file
REM ========================================

echo.
echo ========================================
echo   Kilo Code - Complete Startup
echo ========================================
echo.

REM ========================================
REM Step 1: Kill stale processes
REM ========================================
echo [1/6] Killing stale processes...
taskkill /F /IM chrome.exe 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4001" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
echo     ✓ Stale processes killed

REM ========================================
REM Step 2: Check LM Studio
REM ========================================
echo [2/6] Checking LM Studio...
echo     (Optional - for local model inference)
echo     To enable: Load model in LM Studio, start server on port 1234
echo     Skipping - LM Studio is optional

REM ========================================
REM Step 3: Start Chrome with DevTools
REM ========================================
echo [3/6] Starting Chrome with DevTools...
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug" --no-first-run --no-default-browser-check
echo     ✓ Chrome started with DevTools (port 9222)

REM ========================================
REM Step 4: Wait briefly
REM ========================================
echo [4/6] Waiting for processes...
timeout /t 2 /nobreak >nul

REM ========================================
REM Step 5: Start cockpit backend
REM ========================================
echo [5/6] Starting cockpit backend...
start "Kilo Cockpit" cmd /k "npm run cockpit"
echo     ✓ Backend starting on ports 3000/4000/4001

REM ========================================
REM Step 6: Open cockpit
REM ========================================
echo [6/6] Opening cockpit...
timeout /t 3 /nobreak >nul
start http://localhost:3000/monaco-cockpit.html

echo.
echo ========================================
echo   Startup Complete!
echo ========================================
echo.
echo   LM Studio (Optional): http://localhost:1234/v1
echo   Chrome DevTools:     http://localhost:9222
echo   Cockpit UI:          http://localhost:3000
echo   Backend API:         http://localhost:4000
echo   WebSocket:           ws://localhost:4001
echo.
echo   Multi-Agent Setup:
echo   - Kilo: Browser automation
echo   - Claude: Long-context planning
echo   - Claw: Code transformations
echo   - Lingma: Local CLI inference
echo.
echo ========================================
pause
