export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin.replace(/'/g, "''");
  const script = `# RUET Downloader one-time setup
$ErrorActionPreference = 'Stop'
$sourceBase = '${origin}/api/downloader-helper'
$installDir = Join-Path $env:LOCALAPPDATA 'RUET Downloader'

Write-Host 'Installing RUET Downloader...' -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

foreach ($file in @('server.py', 'start.bat', 'launch-protocol.bat')) {
  Write-Host "Downloading $file..."
  Invoke-WebRequest -UseBasicParsing -Uri "$sourceBase/$file" -OutFile (Join-Path $installDir $file)
}
Set-Content -Path (Join-Path $installDir 'allowed-origin.txt') -Value '${origin}' -Encoding UTF8

if (-not (Get-Command py -ErrorAction SilentlyContinue) -and -not (Get-Command python -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'Python is missing and winget is unavailable. Install Python 3 from https://python.org, then run this setup again.'
  }
  Write-Host 'Installing Python...'
  winget install --id Python.Python.3.12 --exact --accept-package-agreements --accept-source-agreements
}

$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command python -ErrorAction SilentlyContinue }
if (-not $python) {
  $python = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Programs\\Python\\Python*\\python.exe') -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
}
if (-not $python) { throw 'Python was installed but cannot be found. Restart Windows, then run setup.ps1 again.' }

$pythonExe = $python.Source
if (-not $pythonExe) { $pythonExe = $python.FullName }
Write-Host 'Installing Python packages...'
& $pythonExe -m pip install --upgrade pip yt-dlp playwright
& $pythonExe -m playwright install chromium

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue) -and (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host 'Installing FFmpeg...'
  winget install --id Gyan.FFmpeg --exact --accept-package-agreements --accept-source-agreements
}

$commandKey = 'HKCU:\\Software\\Classes\\ruetdownloader\\shell\\open\\command'
New-Item -Path $commandKey -Force | Out-Null
New-ItemProperty -Path 'HKCU:\\Software\\Classes\\ruetdownloader' -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
Set-Item -Path 'HKCU:\\Software\\Classes\\ruetdownloader' -Value 'URL:RUET Downloader Protocol'
$launcher = Join-Path $installDir 'launch-protocol.bat'
Set-Item -Path $commandKey -Value ('"' + $launcher + '" "%1"')

Write-Host 'Starting the downloader...'
Start-Process -FilePath $launcher -ArgumentList 'ruetdownloader://start'
Start-Sleep -Seconds 3

try {
  Invoke-WebRequest -UseBasicParsing -Method Options -Uri 'http://127.0.0.1:8765/download' -TimeoutSec 5 | Out-Null
  Write-Host 'Setup complete. Return to the website and click Installed - Refresh & Enable Downloader.' -ForegroundColor Green
} catch {
  Write-Warning 'Setup completed, but the server is still starting. Check the RUET Downloader window for details.'
}
Read-Host 'Press Enter to close'
`;

  return new Response(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="setup.ps1"',
      "Cache-Control": "no-store",
    },
  });
}
