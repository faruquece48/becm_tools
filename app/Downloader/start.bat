@echo off
title RUET Downloader
cd /d "%~dp0"

echo Stopping any previous downloader server (if running)...
for /f "tokens=5" %%a in ('netstat -aon ^| find "8765" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

set "PYTHON_CMD=py"
where py >nul 2>&1
if errorlevel 1 set "PYTHON_CMD=python"
where %PYTHON_CMD% >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python was not found. Run setup.ps1 again, or restart Windows after installing Python.
    pause
    exit /b 1
)

echo Checking required packages ^(first run only^)...

%PYTHON_CMD% -c "import yt_dlp" >nul 2>&1
if errorlevel 1 (
    echo yt-dlp is missing - installing it now...
    %PYTHON_CMD% -m pip install --upgrade yt-dlp
)

%PYTHON_CMD% -c "import playwright" >nul 2>&1
if errorlevel 1 (
    echo Playwright is missing - installing it now...
    %PYTHON_CMD% -m pip install --upgrade playwright
    echo Downloading the Chromium browser used for 3Speak link detection...
    %PYTHON_CMD% -m playwright install chromium
)

echo Starting video downloader server...
%PYTHON_CMD% server.py
pause
