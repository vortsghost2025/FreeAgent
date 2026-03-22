@echo off
echo ============================================================
echo 🧹 MEV SWARM - CLEAN STARTUP
echo ============================================================
echo.

echo 🔪 Step 1: Killing all existing node processes...
taskkill /F /IM node.exe /T 2>NUL
echo    ✅ All node processes killed
echo.

echo ⏳ Waiting for processes to terminate...
timeout /t 2 /nobreak >NUL
echo.

echo 🚀 Step 2: Starting MEV Swarm fresh...
cd /d %~dp0
start "MEV-Swarm" node simple-launcher.js

echo    ✅ MEV Swarm started in new window
echo.
echo ============================================================
echo ✅ STARTUP COMPLETE
echo ============================================================
