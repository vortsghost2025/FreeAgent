@echo off
echo ========================================
echo FreeAgent - Memurai (Redis) Event Bus Starter
echo ========================================
echo.

REM Check if memurai.exe exists in current directory
if exist "memurai.exe" (
    echo Found Memurai in current directory
    goto :start_memurai
)

REM Check common installation paths
if exist "C:\Program Files\Memurai\Memurai.exe" (
    start "Memurai" "C:\Program Files\Memurai\Memurai.exe"
    goto :test_connection
)

:start_memurai
echo Starting Memurai...
start "Memurai" "memurai.exe"

:test_connection
echo Waiting for Memurai to start...
timeout /t 3 /nobreak >nul

echo Testing connection...
memurai-cli ping

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Memurai/Redis is running on localhost:6379
    echo.
) else (
    echo.
    echo [WARNING] Could not ping Memurai. Retrying...
    timeout /t 2 /nobreak >nul
    memurai-cli ping
    if %errorlevel% equ 0 (
        echo [SUCCESS] Connected!
    ) else (
        echo [ERROR] Could not connect. Check if Memurai started.
    )
    echo.
)

echo ========================================
echo NEXT STEPS:
echo ========================================
echo.
echo 1. npm install
echo.
echo 2. Start agent workers:
echo    node services/agentExamples.js coder
echo    node services/agentExamples.js researcher
echo.
echo 3. In another terminal, publish tasks:
echo    node services/eventBusPublisher.js
echo.
pause
