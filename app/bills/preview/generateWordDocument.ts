import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

const PDF_TO_CSS_PIXEL_SCALE = 96 / 72;

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to render a Word page image."));
    }, "image/png");
  });
}

/**
 * Builds the Word download from the same React-PDF document used by the
 * preview and PDF download. Embedding each rendered page prevents Word's
 * table and pagination engine from changing the layout.
 */
export async function generateWordDocument(
  pdfElement: ReactElement<DocumentProps>
): Promise<Blob> {
  const [{ pdf }, pdfjs, docx] = await Promise.all([
    import("@react-pdf/renderer"),
    import("pdfjs-dist"),
    import("docx"),
  ]);

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const pdfBlob = await pdf(pdfElement).toBlob();
  const loadedPdf = await pdfjs.getDocument(await pdfBlob.arrayBuffer()).promise;
  const pageImages: Array<{
    data: Uint8Array;
    width: number;
    height: number;
    pageWidth: number;
    pageHeight: number;
  }> = [];

  for (let pageNumber = 1; pageNumber <= loadedPdf.numPages; pageNumber += 1) {
    const page = await loadedPdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: PDF_TO_CSS_PIXEL_SCALE });
    const pageSize = page.getViewport({ scale: 1 });
    const canvas = window.document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable in this browser.");

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    pageImages.push({
      data: new Uint8Array(await (await canvasToPng(canvas)).arrayBuffer()),
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
      pageWidth: Math.round(pageSize.width * 20),
      pageHeight: Math.round(pageSize.height * 20),
    });
    page.cleanup();
  }

  await loadedPdf.destroy();

  const document = new docx.Document({
    sections: pageImages.map(({ data, width, height, pageWidth, pageHeight }) => ({
      properties: {
        page: {
          size: { width: pageWidth, height: pageHeight },
          margin: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0, gutter: 0 },
        },
      },
      children: [new docx.Paragraph({
        spacing: { before: 0, after: 0, line: 1 },
        children: [new docx.ImageRun({
          type: "png",
          data,
          transformation: { width, height },
        })],
      })],
    })),
  });

  return docx.Packer.toBlob(document);
}
