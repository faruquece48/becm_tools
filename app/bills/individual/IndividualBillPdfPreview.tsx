"use client";

import { useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { PDFPageProxy } from "pdfjs-dist";

export default function IndividualBillPdfPreview({ document }: { document: ReactElement<DocumentProps> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generation = useRef(0);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [zoom, setZoom] = useState(75);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const id = ++generation.current;
      const blob = await pdf(document).toBlob();
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const loaded = await pdfjs.getDocument(await blob.arrayBuffer()).promise;
      const nextPage = await loaded.getPage(1);
      if (id === generation.current) setPage(nextPage);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [document]);

  useEffect(() => {
    if (!page || !canvasRef.current) return;
    // Render above display resolution so Bengali glyphs remain sharp when the
    // Legal page is fitted into the preview column.
    // Render at high density, then fit it to the preview width. This keeps
    // fine Bengali strokes and thin table borders crisp without enlarging the
    // preview itself.
    const viewport = page.getViewport({ scale: 3 });
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const task = page.render({ canvasContext: context, viewport });
    return () => task.cancel();
  }, [page]);

  return (
    <div className="overflow-auto rounded-xl bg-slate-300 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-white/90 px-3 py-2 text-sm shadow-sm">
        <span className="font-medium text-slate-700">Preview zoom</span>
        <div className="flex items-center gap-1">
          {[50, 75, 100, 125].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              className={`rounded px-2 py-1 text-xs ${zoom === level ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {level}%
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto bg-white shadow-xl ring-1 ring-slate-200" style={{ width: `${zoom}%`, minWidth: zoom > 100 ? `${zoom}%` : undefined }}>
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>
    </div>
  );
}
