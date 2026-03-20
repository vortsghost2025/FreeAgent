@echo off
setlocal enabledelayedexpansion

echo Starting Agent 3 on port 54123...

:: Kill any existing Node processes on port 54123
echo Killing existing processes on port 54123...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :54123 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

:: Wait a moment for port to clear
timeout /t 1 /nobreak >nul

:: Start Agent 3 server in background
echo Starting Agent 3 server...
cd /d S:\workspace\agent3
start "Agent 3 Server (54123)" cmd /k "set PORT=54123 && node server.js"

:: Wait for server to start - poll until port is listening
echo Waiting for server to initialize...
set attempts=0

:wait_loop
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":54123" | findstr "LISTENING" >nul
if !errorlevel! neq 0 (
    set /a attempts+=1
    if !attempts! lss 10 (
        echo Server not ready yet... (attempt !attempts!/10)
        goto wait_loop
    )
)
echo Agent 3 server is ready!

:: Open VS Code for agent3
echo Opening VS Code for Agent 3...
code S:\workspace\agent3

echo Done! Agent 3 should be available at http://localhost:54123
