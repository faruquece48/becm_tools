"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { PDFPageProxy } from "pdfjs-dist";
import { Trash2, Undo2 } from "lucide-react";

type PreviewPage = { page: PDFPageProxy; sourceIndex: number };

export default function CombinedBillPdfPreview({
  document,
  deletable = false,
  deletedPageIndexes,
  onDeletedPagesChange,
  onPdfChange,
}: {
  document: ReactElement<DocumentProps>;
  deletable?: boolean;
  deletedPageIndexes?: number[];
  onDeletedPagesChange?: (indexes: number[]) => void;
  onPdfChange?: (blob: Blob | null) => void;
}) {
  const generation = useRef(0);
  const [pages, setPages] = useState<PreviewPage[]>([]);
  const [internalDeletedPages, setInternalDeletedPages] = useState<number[]>([]);
  const deletedPages = useMemo(
    () => new Set(deletedPageIndexes ?? internalDeletedPages),
    [deletedPageIndexes, internalDeletedPages],
  );
  const updateDeletedPages = (next: Set<number>) => {
    const indexes = Array.from(next).sort((left, right) => left - right);
    if (onDeletedPagesChange) onDeletedPagesChange(indexes);
    else setInternalDeletedPages(indexes);
  };

  useEffect(() => {
    onPdfChange?.(null);
    const timeout = window.setTimeout(async () => {
      const id = ++generation.current;
      const sourceBlob = await pdf(document).toBlob();
      let previewBlob = sourceBlob;
      const sourceBytes = await sourceBlob.arrayBuffer();
      const sourcePdf = await import("pdf-lib").then(({ PDFDocument }) => PDFDocument.load(sourceBytes));
      const activeSourceIndices = Array.from(
        { length: sourcePdf.getPageCount() },
        (_, index) => index,
      ).filter((index) => !deletedPages.has(index));

      if (deletedPages.size > 0) {
        Array.from(deletedPages)
          .filter((index) => index >= 0 && index < sourcePdf.getPageCount())
          .sort((left, right) => right - left)
          .forEach((index) => sourcePdf.removePage(index));
        const filteredBytes = await sourcePdf.save();
        previewBlob = new Blob([Uint8Array.from(filteredBytes).buffer], { type: "application/pdf" });
      }

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const loaded = await pdfjs.getDocument(await previewBlob.arrayBuffer()).promise;
      const nextPages = await Promise.all(Array.from({ length: loaded.numPages }, async (_, index) => ({
        page: await loaded.getPage(index + 1),
        sourceIndex: activeSourceIndices[index],
      })));
      if (id === generation.current) {
        setPages(nextPages);
        onPdfChange?.(previewBlob);
      }
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [deletedPages, document, onPdfChange]);

  const deletePage = (sourceIndex: number, displayedPage: number) => {
    if (pages.length <= 1 || !window.confirm(`Delete page ${displayedPage} from this PDF?`)) return;
    updateDeletedPages(new Set(deletedPages).add(sourceIndex));
  };

  return <div className="space-y-6">
    {deletable && deletedPages.size > 0 && <div className="sticky top-3 z-20 flex justify-end">
      <button type="button" onClick={() => updateDeletedPages(new Set())} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-lg ring-1 ring-indigo-200 hover:bg-indigo-50">
        <Undo2 className="h-4 w-4" /> Restore {deletedPages.size} deleted page{deletedPages.size === 1 ? "" : "s"}
      </button>
    </div>}
    {pages.map(({ page, sourceIndex }, index) => <CanvasPage
      key={sourceIndex}
      page={page}
      pageNumber={index + 1}
      onDelete={deletable && pages.length > 1 ? () => deletePage(sourceIndex, index + 1) : undefined}
    />)}
  </div>;
}

function CanvasPage({ page, pageNumber, onDelete }: { page: PDFPageProxy; pageNumber: number; onDelete?: () => void }) {
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
  return <article className="relative mx-auto max-w-[900px] bg-white shadow-xl ring-1 ring-slate-200">
    <canvas ref={canvasRef} className="block h-auto w-full" />
    {onDelete && <button type="button" onClick={onDelete} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-red-700" aria-label={`Delete page ${pageNumber}`}>
      <Trash2 className="h-4 w-4" /> Delete page
    </button>}
    <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-white">Page {pageNumber}</span>
  </article>;
}
