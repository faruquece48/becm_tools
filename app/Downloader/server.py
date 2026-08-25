from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import subprocess
import os
import sys

# ---- Used only if the HTML page doesn't send a folder ----
DEFAULT_DOWNLOAD_FOLDER = r"C:\Users\HP\Downloads"


def find_m3u8_with_browser(page_url, timeout_ms=25000):
    """
    Opens the page in an invisible (headless) Chromium browser and watches
    every network request until it spots a .m3u8 link -- like checking
    Chrome DevTools -> Network manually, but automatic.
    Returns (m3u8_url_or_None, debug_notes_list)
    """
    from playwright.sync_api import sync_playwright

    found = {"url": None}
    seen_domains = set()
    notes = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--autoplay-policy=no-user-gesture-required",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()

        def on_request(request):
            try:
                host = request.url.split("/")[2]
                seen_domains.add(host)
            except Exception:
                pass
            if found["url"] is None and ".m3u8" in request.url:
                found["url"] = request.url

        context.on("request", on_request)

        try:
            page.goto(page_url, wait_until="load", timeout=timeout_ms)
            page.wait_for_timeout(4000)

            # Try several ways to nudge the player into loading its source
            for selector in ["video", ".vjs-big-play-button", "button[aria-label='Play']", "[class*=play]"]:
                if found["url"]:
                    break
                try:
                    page.click(selector, timeout=1500, force=True)
                except Exception:
                    pass
                page.wait_for_timeout(1500)

            # Last resort: click the middle of the page
            if not found["url"]:
                try:
                    page.mouse.click(640, 400)
                except Exception:
                    pass

            # Give network requests time to fire after the click(s)
            for _ in range(6):
                if found["url"]:
                    break
                page.wait_for_timeout(1500)

        except Exception as e:
            notes.append("Browser navigation issue: " + str(e))
        finally:
            browser.close()

    if not found["url"]:
        notes.append("Domains contacted while loading the page: " + ", ".join(sorted(seen_domains)) or "none")

    return found["url"], notes


class Handler(BaseHTTPRequestHandler):

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path != "/download":
            self.send_response(404)
            self._cors()
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        try:
            data = json.loads(self.rfile.read(length))
        except Exception:
            data = {}

        def clean_path(p):
            p = p.strip()
            # Windows "Copy as path" wraps paths in double quotes, which
            # breaks os.path.isfile()/makedirs() checks silently.
            if len(p) >= 2 and p[0] == '"' and p[-1] == '"':
                p = p[1:-1]
            return p.strip()

        url = data.get("url", "").strip()
        folder = clean_path(data.get("folder", "")) or DEFAULT_DOWNLOAD_FOLDER
        filename = data.get("filename", "").strip()
        quality = data.get("quality", "best").strip()
        cookies_file = clean_path(data.get("cookies", ""))
        site = data.get("site", "").strip().lower()  # "", "youtube", "3speak", "x"

        if not url:
            self._reply(400, {"success": False, "error": "No URL provided"})
            return

        try:
            os.makedirs(folder, exist_ok=True)
        except Exception as e:
            self._reply(400, {
                "success": False,
                "error": "Could not create/access folder '" + folder + "': " + str(e)
            })
            return

        if "youtube.com/playables" in url:
            self._reply(200, {
                "success": False,
                "output": "",
                "error": (
                    "This is a YouTube Playables link (an interactive mini-game/short, not a "
                    "regular video) -- there's no video stream behind it, only game code, so "
                    "yt-dlp can't download it. If you wanted a specific video, paste its normal "
                    "/watch?v=... link instead."
                ),
            })
            return

        notes = []
        target_url = url
        sniff_failed = False

        looks_like_direct_stream = (".m3u8" in url) or ("/hls?" in url)
        if ("3speak.tv" in url) and not looks_like_direct_stream:
            notes.append("Detected a 3Speak page link -> opening it in a hidden browser to find the real video stream...")
            try:
                sniffed, sniff_notes = find_m3u8_with_browser(url)
                notes.extend(sniff_notes)
                if sniffed:
                    target_url = sniffed
                    notes.append("Found stream link automatically: " + sniffed)
                else:
                    sniff_failed = True
                    notes.append("Could not auto-detect the stream link (see domains above).")
            except ImportError:
                sniff_failed = True
                notes.append("Playwright is not installed. Run: pip install playwright   then: playwright install chromium")
            except Exception as e:
                sniff_failed = True
                notes.append("Auto-detect failed: " + str(e))

        if sniff_failed:
            # Don't bother calling yt-dlp's broken ThreeSpeak extractor on the
            # page URL -- it will just fail with the same error every time.
            self._reply(200, {
                "success": False,
                "output": "\n".join(notes),
                "error": (
                    "Auto-detection could not find the video stream this time.\n"
                    "Please open the page in Chrome, press F12 -> Network, filter by 'm3u8', "
                    "play the video, right-click the request -> Copy URL, and paste that link here instead."
                ),
            })
            return

        try:
            output_template = (filename + ".%(ext)s") if filename else "%(title)s.%(ext)s"

            # Invoke yt-dlp as a Python module instead of a separate PATH executable,
            # since it's guaranteed to be importable if `pip install yt-dlp` was run.
            command = [
                sys.executable, "-m", "yt_dlp",
                target_url,
                "-P", folder,
                "-o", output_template,
                "--force-overwrites",
                "--extractor-args", "youtube:player_client=android,web",
            ]

            is_x_url = ("x.com" in target_url) or ("twitter.com" in target_url)
            if is_x_url:
                # X/Twitter blocks plain requests fairly aggressively; a
                # normal browser UA plus (optionally) cookies gets past
                # most 403s. --extractor-retries helps with flaky CDN hosts.
                command += [
                    "--user-agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "--extractor-retries", "3",
                ]
            else:
                command += [
                    "--add-header", "Referer:https://play.3speak.tv/",
                    "--add-header", "Origin:https://play.3speak.tv",
                ]

            if quality == "audio":
                command += ["-x", "--audio-format", "mp3"]
            elif quality in ("1080", "720", "480"):
                command += [
                    "-f",
                    "bv*[vcodec^=avc1][ext=mp4][height<=" + quality + "]+ba[ext=m4a]/"
                    "b[vcodec^=avc1][ext=mp4][height<=" + quality + "]/"
                    "best[height<=" + quality + "]",
                    "--merge-output-format", "mp4",
                ]
            else:
                command += [
                    "-f",
                    "bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/"
                    "b[vcodec^=avc1][ext=mp4]/"
                    "best",
                    "--merge-output-format", "mp4",
                ]

            if cookies_file:
                if os.path.isfile(cookies_file):
                    command += ["--cookies", cookies_file]
                    notes.append("Using cookies file: " + cookies_file)
                else:
                    notes.append("Cookies file not found at '" + cookies_file + "' (checked after removing any surrounding quotes), continuing without it.")

            process = subprocess.run(command, capture_output=True, text=True)

            combined_out = process.stdout
            no_real_download = (
                "Downloading 0 items" in combined_out
                or ("Finished downloading playlist" in combined_out and "[download] 100%" not in combined_out and "has already been downloaded" not in combined_out)
            )
            actually_succeeded = (process.returncode == 0) and not no_real_download

            output_text = "\n".join(notes) + "\n\n" + combined_out
            response = {
                "success": actually_succeeded,
                "output": output_text[-4000:],
                "error": (process.stderr[-4000:] if not actually_succeeded and process.stderr else
                          ("" if actually_succeeded else "No video was actually downloaded (yt-dlp found nothing to fetch at that URL, e.g. an empty channel/tab/playlist).")),
            }
            self._reply(200, response)

        except FileNotFoundError:
            self._reply(500, {
                "success": False,
                "error": "yt-dlp not found. Install it with: winget install yt-dlp.yt-dlp"
            })
        except Exception as e:
            self._reply(500, {"success": False, "error": str(e)})

    def _reply(self, code, obj):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode())

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    print("Downloader server running at http://127.0.0.1:8765")
    print("Default save folder:", DEFAULT_DOWNLOAD_FOLDER, "(can be overridden per-download from the page)")
    HTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
