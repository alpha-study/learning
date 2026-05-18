import { getApiBaseUrl } from "@/lib/api/client";
import { getVendorAuthToken } from "@/lib/mock-auth";

function requestHeadersForPdfUrl(url: string): HeadersInit {
  const headers = new Headers();
  headers.set("Accept", "application/pdf,*/*");
  const token = getVendorAuthToken();
  if (!token) return headers;

  try {
    const target = new URL(url, typeof window !== "undefined" ? window.location.href : undefined);
    const apiBase = getApiBaseUrl();
    if (apiBase.startsWith("http")) {
      const apiOrigin = new URL(apiBase).origin;
      if (target.origin === apiOrigin) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } else if (typeof window !== "undefined" && target.origin === window.location.origin) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    /* ignore malformed URLs */
  }
  return headers;
}

/**
 * Load a study-material PDF for inline viewing (avoids Content-Disposition: attachment downloads).
 * Returns an object URL — call {@link revokeStudyMaterialPdfBlobUrl} when done.
 */
export async function fetchStudyMaterialPdfBlobUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    headers: requestHeadersForPdfUrl(url),
    credentials: "omit",
  });
  if (!res.ok) {
    throw new Error(`Could not load PDF (${res.status})`);
  }
  const blob = await res.blob();
  const pdfBlob =
    blob.type === "application/pdf"
      ? blob
      : new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
  return URL.createObjectURL(pdfBlob);
}

/** Object URL from an unsaved local PDF file. */
export function createLocalPdfBlobUrl(file: File): string {
  const pdfBlob =
    file.type === "application/pdf"
      ? file
      : new Blob([file], { type: "application/pdf" });
  return URL.createObjectURL(pdfBlob);
}

export function revokeStudyMaterialPdfBlobUrl(blobUrl: string | null | undefined): void {
  if (blobUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(blobUrl);
  }
}
