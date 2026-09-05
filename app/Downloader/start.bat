@echo off
title RUET Downloader
cd /d "%~dp0"

set "PYTHON_CMD=py"
py -c "import sys" >nul 2>&1
if errorlevel 1 set "PYTHON_CMD=python"
%PYTHON_CMD% -c "import sys" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python was not found. Run setup.ps1 again, or restart Windows after installing Python.
    pause
    exit /b 1
)

rem Leave an existing downloader (and any active download) running.
%PYTHON_CMD% -c "import urllib.request; urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8765/download', method='OPTIONS'), timeout=2)" >nul 2>&1
if not errorlevel 1 exit /b 0

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
