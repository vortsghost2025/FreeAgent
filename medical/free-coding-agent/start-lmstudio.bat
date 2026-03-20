@echo off
REM ========================================
REM LM Studio - Start Local Inference Server
REM ========================================
REM
REM This starts LM Studio's local inference server.
REM LM Studio acts as a model router - hot-swap models
REM without touching the cockpit.
REM
REM Usage:
REM   1. Open LM Studio app
REM   2. Load a model (e.g., llama-3.1, qwen, etc.)
REM   3. Click "Start Server" (or use this script)
REM   4. Cockpit automatically routes through LM Studio
REM
REM Default endpoint: http://localhost:1234/v1
REM ========================================

echo.
echo ========================================
echo   LM Studio - Local Inference
echo ========================================
echo.
echo Starting LM Studio server...
echo.
echo Endpoint: http://localhost:1234/v1
echo.
echo To use with your cockpit:
echo   1. Load a model in LM Studio
echo   2. Start the server in LM Studio
echo   3. All agents will route through LM Studio
echo.
echo Models available through LM Studio:
echo   - Any GGUF model you download
echo   - llama-3.1, qwen, mistral, etc.
echo   - Hot-swap models without code changes
echo.
echo Cockpit config now uses:
echo   - Primary: lmstudio (http://localhost:1234/v1)
echo   - Fallback: ollama
echo.
echo ========================================
echo.

REM Try to start LM Studio if installed
set "LMSTUDIO_PATH=C:\Users\seand\AppData\Local\LM Studio\lm-studio.exe"

if exist "%LMSTUDIO_PATH%" (
    echo Starting LM Studio...
    start "" "%LMSTUDIO_PATH%"
) else (
    echo LM Studio not found at default location.
    echo Please open LM Studio manually.
)

echo.
echo Once LM Studio is running with a model loaded:
echo   - The server should auto-start on port 1234
echo   - Or go to: http://localhost:1234/v1
echo.
pause
