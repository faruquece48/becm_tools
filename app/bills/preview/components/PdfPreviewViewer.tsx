"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { PDFPageProxy } from "pdfjs-dist";
import type { ExaminationBillData } from "../../create/components/types";
import BillPdfDocument from "../../create/components/pdf/BillPdfDocument";

interface PageData {
  page: PDFPageProxy;
  width: number;
  height: number;
}

function CanvasPage({ data, index }: { data: PageData; index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Render at high density, then fit the canvas to the page container. This
    // keeps small text and thin table rules sharp without changing PDF layout.
    const viewport = data.page.getViewport({ scale: 3 });
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const task = data.page.render({ canvasContext: context, viewport });
    return () => task.cancel();
  }, [data]);

  return (
    <div
      data-page-index={index}
      className="relative mx-auto bg-white shadow-xl ring-1 ring-slate-200"
      style={{
        width: "min(100%, 900px)",
        aspectRatio: `${data.width} / ${data.height}`,
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <span className="absolute bottom-2 right-3 rounded bg-black/55 px-2 py-0.5 text-[10px] text-white">
        Page {index + 1}
      </span>
    </div>
  );
}

export default function PdfPreviewViewer({ bill }: { bill: ExaminationBillData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef({ page: 0, offset: 0 });
  const generationRef = useRef(0);
  const [pages, setPages] = useState<PageData[]>([]);
  const [updating, setUpdating] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const generation = ++generationRef.current;
      const container = containerRef.current;

      if (container && pages.length) {
        const pageElements = Array.from(
          container.querySelectorAll<HTMLElement>("[data-page-index]")
        );
        const current = [...pageElements]
          .reverse()
          .find((element) => element.offsetTop <= container.scrollTop + 20);
        if (current) {
          anchorRef.current = {
            page: Number(current.dataset.pageIndex) || 0,
            offset: container.scrollTop - current.offsetTop,
          };
        }
      }

      setUpdating(true);
      const blob = await pdf(<BillPdfDocument bill={bill} />).toBlob();
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      const document = await pdfjs.getDocument(await blob.arrayBuffer()).promise;
      const nextPages = await Promise.all(
        Array.from({ length: document.numPages }, async (_, pageIndex) => {
          const page = await document.getPage(pageIndex + 1);
          const viewport = page.getViewport({ scale: 1 });
          return { page, width: viewport.width, height: viewport.height };
        })
      );

      if (generation === generationRef.current) {
        setPages(nextPages);
        setUpdating(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [bill, pages.length]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !pages.length) return;
    const anchor = anchorRef.current;
    const page = container.querySelector<HTMLElement>(
      `[data-page-index="${Math.min(anchor.page, pages.length - 1)}"]`
    );
    if (page) container.scrollTop = page.offsetTop + anchor.offset;
  }, [pages]);

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto bg-slate-300 p-4">
      <div className="space-y-4">
        {pages.map((page, index) => (
          <CanvasPage key={`${index}-${page.width}-${page.height}`} data={page} index={index} />
        ))}
      </div>
      {updating && (
        <div className="sticky bottom-3 ml-auto mt-3 w-fit rounded-full bg-slate-900/80 px-3 py-1 text-xs text-white shadow">
          Updating preview…
        </div>
      )}
    </div>
  );
}
