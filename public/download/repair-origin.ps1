# Run as your normal Windows user, while RUET Downloader is running.
$ErrorActionPreference = 'Stop'
$installDir = Join-Path $env:LOCALAPPDATA 'RUET Downloader'
if (-not (Test-Path -LiteralPath (Join-Path $installDir 'server.py'))) {
    throw 'RUET Downloader was not found in your user installation folder. Run the latest setup.ps1 from the website first.'
}

# Windows PowerShell's Set-Content -Encoding UTF8 adds a BOM, which older
# downloader servers incorrectly treat as part of the permitted website URL.
$origin = 'https://becm.vercel.app'
$originFile = Join-Path $installDir 'allowed-origin.txt'
[System.IO.File]::WriteAllText($originFile, $origin, (New-Object System.Text.UTF8Encoding($false)))

try {
    $response = Invoke-WebRequest -UseBasicParsing -Method Options -Uri 'http://127.0.0.1:8765/download' -Headers @{ Origin = $origin } -TimeoutSec 5
    if ($response.Headers['Access-Control-Allow-Origin'] -ne $origin) {
        throw 'The running server did not return the required website permission header.'
    }
    Write-Host 'Fixed. Return to the website and click Download again. Keep the downloader window open.' -ForegroundColor Green
} catch {
    Write-Warning ('Permission file repaired, but the connection check failed: ' + $_.Exception.Message)
    Write-Host 'Restart RUET Downloader and retry. If it still fails, run the latest setup.ps1 from the website.'
}
Read-Host 'Press Enter to close'
