@echo off
echo ========================================
echo Starting All Servers
echo ========================================

echo [1/3] Killing all node processes...
taskkill /F /IM node.exe 2>nul

echo [2/3] Starting Free Coding Agent on port 3000...
start "FreeCodingAgent" cmd /k "cd c:\workspace\medical\free-coding-agent && node bin\web.js"

echo [3/3] Starting Cockpit Backend on port 4000...
start "CockpitBackend" cmd /k "cd C:\agent-cockpit\cockpit-ui\backend && node server.js"

echo.
echo ========================================
echo Servers started!
echo - Free Coding Agent: http://localhost:3000
echo - Cockpit UI: http://localhost:4000
echo ========================================
