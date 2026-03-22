@echo off
setlocal enabledelayedexpansion

echo Starting Agent 1 on port 54121...

:: Kill any existing Node processes on port 54121
echo Killing existing processes on port 54121...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :54121 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

:: Wait a moment for port to clear
timeout /t 1 /nobreak >nul

:: Start Agent 1 server in background
echo Starting Agent 1 server...
cd /d S:\workspace\agent1
start "Agent 1 Server (54121)" cmd /k "set PORT=54121 && node server.js"

:: Wait for server to start - poll until port is listening
echo Waiting for server to initialize...
set attempts=0

:wait_loop
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":54121" | findstr "LISTENING" >nul
if !errorlevel! neq 0 (
    set /a attempts+=1
    if !attempts! lss 10 (
        echo Server not ready yet... (attempt !attempts!/10)
        goto wait_loop
    )
)
echo Agent 1 server is ready!

:: Open VS Code for agent1
echo Opening VS Code for Agent 1...
code S:\workspace\agent1

echo Done! Agent 1 should be available at http://localhost:54121
