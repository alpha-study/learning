import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export { pdfjs };
export type { PDFDocumentProxy } from "pdfjs-dist";

/** A4 portrait width / height (ISO 210×297 mm). */
export const A4_ASPECT_RATIO = 210 / 297;

/** Page height in px — ~92% of viewport so one A4 page fits the screen. */
export function getScreenFitPageHeightPx(): number {
  if (typeof window === "undefined") return 800;
  return Math.floor(window.innerHeight * 0.92);
}

export function getScreenFitPageWidthPx(pageHeightPx: number): number {
  return Math.floor(pageHeightPx * A4_ASPECT_RATIO);
}
