@echo off
REM Azurite Startup Script
REM This script starts Azurite (Azure Storage Emulator) with:
REM - Blob storage on port 10000
REM - Queue storage on port 10001
REM - Table storage on port 10002

echo Starting Azurite...

REM Create data directories if they don't exist
if not exist "C:\azurite-data\blob" mkdir "C:\azurite-data\blob"
if not exist "C:\azurite-data\queue" mkdir "C:\azurite-data\queue"
if not exist "C:\azurite-data\table" mkdir "C:\azurite-data\table"

REM Start Azurite with all three services
REM Use --locationHost to bind to localhost
start "Azurite Blob" cmd /k "azurite-blob --blobHost 127.0.0.1 --blobPort 10000 --location C:\azurite-data\blob --metadataPath C:\azurite-data\blob"
start "Azurite Queue" cmd /k "azurite-queue --queueHost 127.0.0.1 --queuePort 10001 --location C:\azurite-data\queue --metadataPath C:\azurite-data\queue"
start "Azurite Table" cmd /k "azurite-table --tableHost 127.0.0.1 --tablePort 10002 --location C:\azurite-data\table --metadataPath C:\azurite-data\table"

echo Azurite services started:
echo   Blob:    http://127.0.0.1:10000
echo   Queue:   http://127.0.0.1:10001
echo   Table:   http://127.0.0.1:10002
echo.
echo Data directories:
echo   C:\azurite-data\blob
echo   C:\azurite-data\queue
echo   C:\azurite-data\table
echo.
echo To stop Azurite, close all Azurite command windows or kill the processes.
