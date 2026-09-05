import { spawn } from "child_process";
import path from "path";
import { NextResponse } from "next/server";

const WINDOW_TITLE = "RUET Downloader";

// Launches the local downloader server (start.bat) in its own console window.
// Only makes sense when the Next.js app itself is running on the user's own machine.
export async function POST() {
  const downloaderDir = path.join(process.cwd(), "app", "Downloader");

  try {
    const child = spawn("cmd.exe", ["/c", "start", "/min", WINDOW_TITLE, "start.bat"], {
      cwd: downloaderDir,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    await new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    child.unref();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
