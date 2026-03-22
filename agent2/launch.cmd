@echo off
setlocal enabledelayedexpansion

echo Starting Agent 2 on port 54122...

:: Kill any existing Node processes on port 54122
echo Killing existing processes on port 54122...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :54122 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

:: Wait a moment for port to clear
timeout /t 1 /nobreak >nul

:: Start Agent 2 server in background
echo Starting Agent 2 server...
cd /d S:\workspace\agent2
start "Agent 2 Server (54122)" cmd /k "set PORT=54122 && node server.js"

:: Wait for server to start - poll until port is listening
echo Waiting for server to initialize...
set attempts=0

:wait_loop
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":54122" | findstr "LISTENING" >nul
if !errorlevel! neq 0 (
    set /a attempts+=1
    if !attempts! lss 10 (
        echo Server not ready yet... (attempt !attempts!/10)
        goto wait_loop
    )
)
echo Agent 2 server is ready!

:: Open VS Code for agent2
echo Opening VS Code for Agent 2...
code S:\workspace\agent2

echo Done! Agent 2 should be available at http://localhost:54122
