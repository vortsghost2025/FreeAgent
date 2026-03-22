@echo off
echo 📱 PHONE-FRIENDLY LOG MONITOR
echo =============================
echo This creates a simplified log for mobile viewing

:loop
cls
echo [%date% %time%] WE4Free YOLO Status:
echo ----------------------------------------
type yolo-status.txt 2>nul | findstr /C:"pipelines" /C:"SUCCESS" /C:"FAILED" /C:"Rate"
echo.
echo Last updated: %date% %time%
echo Press Ctrl+C to stop monitoring
timeout /t 60 /nobreak >nul
goto loop