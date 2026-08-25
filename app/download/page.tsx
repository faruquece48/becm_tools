"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

const DEFAULT_FOLDER = "C:\\Users\\HP\\Downloads";

type FormState = {
  url: string;
  quality: string;
  folder: string;
  filename: string;
  cookies: string;
};

const defaultForm: FormState = {
  url: "",
  quality: "best",
  folder: DEFAULT_FOLDER,
  filename: "",
  cookies: "",
};

function detectSite(url: string) {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "▶️ YouTube";
  if (u.includes("x.com") || u.includes("twitter.com")) return "𝕏 X / Twitter";
  if (u.includes("3speak.tv")) return "📡 3Speak";
  if (u.includes(".m3u8") || u.includes("/hls?")) return "🔗 Direct stream link";
  if (u.length > 0) return "🌐 Generic link";
  return "Paste a link above";
}

function detectSiteKey(url: string) {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("x.com") || u.includes("twitter.com")) return "x";
  if (u.includes("3speak.tv")) return "3speak";
  if (u.includes(".m3u8") || u.includes("/hls?")) return "stream";
  if (u.length > 0) return "other";
  return "";
}

export default function DownloadPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasAutoStarted = useRef(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const startServer = useCallback(() => {
    if (typeof window === "undefined") return;

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      fetch("/api/run-downloader", { method: "POST" }).catch(() => {
        // silently ignore; the request below will simply fail to reach the server
      });
    } else {
      // Deployed/online: a website can't launch a local .bat file directly, so use a
      // custom URL protocol registered once on this PC (see register-protocol.reg).
      window.location.href = "ruetdownloader://start";
    }
  }, []);

  const waitForServer = async () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        await fetch("http://127.0.0.1:8765/download", { method: "OPTIONS", mode: "cors" });
        return true;
      } catch {
        // If the server still isn't up after a few seconds, try (re)launching it
        // in case the original auto-start on page load never actually fired.
        if (attempt === 3 || attempt === 8) {
          startServer();
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    return false;
  };

  useEffect(() => {
    // Guard against React StrictMode's double-invoke in development, which would launch two windows.
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    startServer();
  }, [startServer]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDownload = async () => {
    const url = form.url.trim();
    if (!url) {
      alert("Please paste a link first.");
      return;
    }

    setDownloading(true);
    setResult(null);

    const serverReady = await waitForServer();
    if (!serverReady) {
      setResult({
        ok: false,
        text:
          "✘ Could not reach the local downloader server.\n\n" +
          "It may still be starting up (installing dependencies on first run can take a while) " +
          "or failed to launch. Click Download again in a moment, or check the minimized " +
          '"RUET Downloader" window for errors.',
      });
      setDownloading(false);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8765/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          folder: form.folder.trim(),
          filename: form.filename.trim(),
          quality: form.quality,
          cookies: form.cookies.trim(),
          site: detectSiteKey(url),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({ ok: true, text: "✔ Download finished! Check your folder.\n\n" + (data.output || "") });
      } else {
        setResult({
          ok: false,
          text:
            "✘ Download failed.\n\n" +
            (data.error || "Unknown error") +
            (data.output ? "\n\n--- debug info ---\n" + data.output : ""),
        });
      }
    } catch (err) {
      setResult({
        ok: false,
        text:
          "✘ Could not reach the local downloader server.\n\n" +
          "Make sure the downloader window is running in the background.\n\n" +
          "Error: " + String(err),
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px] bg-slate-100 text-slate-900">
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="m-4 rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="p-4 sm:p-6">
          <div className="mx-auto max-w-2xl rounded-xl border bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-[#102555]">🎬 Video Downloader</h2>
            <p className="mt-1 text-sm text-slate-600">
              Paste any video link — YouTube, X/Twitter, Facebook link.
            </p>

            <label className="mt-5 block text-xs font-semibold text-slate-600">Video link</label>
            <input
              type="text"
              autoComplete="off"
              placeholder="https://... paste link here"
              value={form.url}
              onChange={(e) => updateField("url", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {detectSite(form.url.trim())}
            </span>

            <label className="mt-4 block text-xs font-semibold text-slate-600">Quality</label>
            <select
              value={form.quality}
              onChange={(e) => updateField("quality", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="best">Best available (video + audio)</option>
              <option value="1080">Up to 1080p</option>
              <option value="720">Up to 720p</option>
              <option value="480">Up to 480p</option>
              <option value="audio">Audio only (MP3)</option>
            </select>

            <label className="mt-4 block text-xs font-semibold text-slate-600">Save to folder</label>
            <input
              type="text"
              placeholder={DEFAULT_FOLDER}
              value={form.folder}
              onChange={(e) => updateField("folder", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            />

            <label className="mt-4 block text-xs font-semibold text-slate-600">
              File name (optional, leave blank for automatic)
            </label>
            <input
              type="text"
              placeholder="e.g. my-video"
              value={form.filename}
              onChange={(e) => updateField("filename", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            />

            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Cookies file (optional, needed for private/login-only videos)
            </label>
            <input
              type="text"
              placeholder="C:\Users\HP\Downloads\cookies.txt"
              value={form.cookies}
              onChange={(e) => updateField("cookies", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Type the path normally, or paste it — don&apos;t use &quot;Copy as path&quot; from File
              Explorer (it wraps the path in quotes). This page strips quotes automatically either
              way.
            </p>

            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="mt-5 w-full rounded-lg bg-indigo-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {downloading ? "Downloading... please wait" : "Download Video"}
            </button>

            {result && (
              <pre
                className={`mt-5 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs ${
                  result.ok ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {result.text}
              </pre>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
