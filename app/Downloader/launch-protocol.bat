@echo off
rem Invoked by Windows via the registered "ruetdownloader://" protocol handler.
rem %1 is the full "ruetdownloader://start" URL passed by the OS - it's ignored here.
cd /d "%~dp0"

taskkill /F /T /FI "WINDOWTITLE eq RUET Downloader*" >nul 2>&1
start /min "RUET Downloader" cmd /c start.bat
