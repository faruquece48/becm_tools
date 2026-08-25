"use client";

import { useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { PDFPageProxy } from "pdfjs-dist";

export default function CombinedBillPdfPreview({ document }: { document: ReactElement<DocumentProps> }) {
  const generation = useRef(0);
  const [pages, setPages] = useState<PDFPageProxy[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const id = ++generation.current;
      const blob = await pdf(document).toBlob();
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const loaded = await pdfjs.getDocument(await blob.arrayBuffer()).promise;
      const nextPages = await Promise.all(Array.from({ length: loaded.numPages }, (_, index) => loaded.getPage(index + 1)));
      if (id === generation.current) setPages(nextPages);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [document]);

  return <div className="space-y-6">{pages.map((page, index) => <CanvasPage key={index} page={page} pageNumber={index + 1} />)}</div>;
}

function CanvasPage({ page, pageNumber }: { page: PDFPageProxy; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viewport = page.getViewport({ scale: 3 });
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const task = page.render({ canvasContext: context, viewport });
    return () => task.cancel();
  }, [page]);
  return <article className="relative mx-auto max-w-[900px] bg-white shadow-xl ring-1 ring-slate-200"><canvas ref={canvasRef} className="block h-auto w-full" /><span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-white">Page {pageNumber}</span></article>;
}
