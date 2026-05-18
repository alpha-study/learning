import { useCallback, useEffect, useRef, useState } from "react";
import {
  getScreenFitPageHeightPx,
  getScreenFitPageWidthPx,
  pdfjs,
  type PDFDocumentProxy,
} from "@/lib/pdfjs";

type StudyMaterialPdfPagesProps = {
  blobUrl: string;
  title: string;
};

type PdfPageProps = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  pageHeightPx: number;
};

function PdfPage({ pdf, pageNumber, pageHeightPx }: PdfPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderedRef = useRef(false);
  const [size, setSize] = useState({
    width: getScreenFitPageWidthPx(pageHeightPx),
    height: pageHeightPx,
  });

  const renderPage = useCallback(async () => {
    if (renderedRef.current || !canvasRef.current) return;
    renderedRef.current = true;

    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const scale = pageHeightPx / base.height;
    const viewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    setSize({ width: canvas.width, height: canvas.height });

    await page.render({ canvasContext: context, viewport }).promise;
  }, [pdf, pageNumber, pageHeightPx]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void renderPage();
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [renderPage]);

  return (
    <div
      ref={containerRef}
      className="bg-white shadow-lg"
      style={{ width: size.width, height: size.height }}
      aria-label={`Page ${pageNumber}`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

/** Renders PDF pages at screen-fit A4 height (portrait), scrollable. */
export function StudyMaterialPdfPages({ blobUrl, title }: StudyMaterialPdfPagesProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageHeightPx, setPageHeightPx] = useState(getScreenFitPageHeightPx);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setPageHeightPx(getScreenFitPageHeightPx());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let doc: PDFDocumentProxy | null = null;

    const load = async () => {
      try {
        const task = pdfjs.getDocument(blobUrl);
        doc = await task.promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        setPdf(doc);
        setNumPages(doc.numPages);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Could not render PDF");
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      setPdf(null);
      setNumPages(0);
      void doc?.destroy();
    };
  }, [blobUrl]);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-white/70">
        {loadError}
      </div>
    );
  }

  if (!pdf || numPages === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
        Preparing pages…
      </div>
    );
  }

  return (
    <div
      className="h-full w-full overflow-y-auto overflow-x-hidden bg-neutral-800"
      aria-label={title}
    >
      <div className="flex flex-col items-center gap-4 py-4">
        {Array.from({ length: numPages }, (_, i) => (
          <PdfPage
            key={`${blobUrl}-page-${i + 1}-${pageHeightPx}`}
            pdf={pdf}
            pageNumber={i + 1}
            pageHeightPx={pageHeightPx}
          />
        ))}
      </div>
    </div>
  );
}
