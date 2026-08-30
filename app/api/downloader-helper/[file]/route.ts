import { readFile } from "node:fs/promises";
import path from "node:path";

const FILES: Record<string, string> = {
  "server.py": "server.py",
  "start.bat": "start.bat",
  "launch-protocol.bat": "launch-protocol.bat",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> }
) {
  const { file } = await context.params;
  const safeName = FILES[file];

  if (!safeName) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const contents = await readFile(
      path.join(process.cwd(), "app", "Downloader", safeName)
    );
    return new Response(contents, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Helper file is unavailable", { status: 500 });
  }
}
