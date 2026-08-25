@echo off
title RUET Downloader
cd /d "%~dp0"

echo Stopping any previous downloader server (if running)...
for /f "tokens=5" %%a in ('netstat -aon ^| find "8765" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

where py >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python launcher "py" was not found. Install Python from https://www.python.org/downloads/ and try again.
    pause
    exit /b 1
)

echo Checking required packages ^(first run only^)...

py -c "import yt_dlp" >nul 2>&1
if errorlevel 1 (
    echo yt-dlp is missing - installing it now...
    py -m pip install --upgrade yt-dlp
)

py -c "import playwright" >nul 2>&1
if errorlevel 1 (
    echo Playwright is missing - installing it now...
    py -m pip install --upgrade playwright
    echo Downloading the Chromium browser used for 3Speak link detection...
    py -m playwright install chromium
)

echo Starting video downloader server...
py server.py
pause
