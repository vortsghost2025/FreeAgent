@echo off
echo 🤖 KILO AUTONOMOUS MODE ACTIVATED
echo Full workspace access granted - no manual approval needed

REM Start cockpit server in background
start "" "npm" "run" "start"

REM Wait for server to initialize
timeout /t 30 /nobreak >nul

REM Launch Kilo with full autonomy
node src/agents/kilo-agent.js --autonomous --full-access --no-manual-approval

echo ✅ Kilo running with full autonomous access!
pause