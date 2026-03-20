@echo off
echo 🧘 Gentle Memory Cleanup
echo ======================
echo Starting light-touch cleanup process...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0gentle-cleanup.ps1" %*

echo.
echo Cleanup process completed.
pause