# ============================================================
# One-time setup for the Video Downloader tool
# Covers: YouTube, 3Speak, Facebook
# Run these lines in PowerShell (copy/paste one at a time,
# or save this whole file as setup.ps1 and run it).
# ============================================================

# 1. Python - runs server.py
winget install Python.Python.3.12

# 2. yt-dlp - the actual download engine (YouTube, Facebook, etc.)
winget install yt-dlp.yt-dlp

# 3. FFmpeg - merges video+audio, converts to mp4/mp3
winget install Gyan.FFmpeg

# ---- Close PowerShell and reopen it here before continuing ----
# (refreshes PATH so python/yt-dlp/ffmpeg are recognized)

# 4. Playwright - needed only for automatic 3Speak stream detection
py -m pip install playwright
py -m playwright install chromium --force

# ---- Verify everything installed correctly ----
py --version
yt-dlp --version
ffmpeg -version
