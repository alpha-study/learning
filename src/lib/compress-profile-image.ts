/**
 * Client-side profile photo compression for uploads under a byte cap.
 * Prefers high WebP/JPEG quality and only then scales dimensions (smooth, high-quality resampling).
 */

const LONG_EDGE_START = 2560;
const LONG_EDGE_MIN = 640;

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaleToLongEdge(
  width: number,
  height: number,
  longEdge: number
): { width: number; height: number } {
  const maxSide = Math.max(width, height);
  if (maxSide <= longEdge) {
    return { width, height };
  }
  const r = longEdge / maxSide;
  return {
    width: Math.max(1, Math.round(width * r)),
    height: Math.max(1, Math.round(height * r)),
  };
}

async function canvasToBlob(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  mime: string,
  quality: number
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, sw, sh);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

function withExtension(name: string, mime: string): string {
  const base = name.replace(/\.[^.]+$/i, "").trim() || "profile";
  const ext = mime === "image/webp" ? ".webp" : ".jpg";
  return `${base}${ext}`;
}

/**
 * If `file` is already under `maxBytes`, returns it unchanged.
 * Otherwise re-encodes (WebP then JPEG) at decreasing quality, then reduces long edge stepwise.
 */
export async function compressProfileImageIfNeeded(
  file: File,
  maxBytes: number
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  if (file.size <= maxBytes) {
    return file;
  }

  const img = await loadImageElement(file);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw < 1 || ih < 1) {
    return file;
  }

  const mimeCandidates: { mime: string; qualities: number[] }[] = [
    { mime: "image/webp", qualities: [0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68, 0.64, 0.6, 0.56, 0.52, 0.48] },
    { mime: "image/jpeg", qualities: [0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68, 0.64, 0.6, 0.56, 0.52, 0.48] },
  ];

  let longEdge = Math.min(LONG_EDGE_START, Math.max(iw, ih));

  while (longEdge >= LONG_EDGE_MIN) {
    const { width, height } = scaleToLongEdge(iw, ih, longEdge);
    for (const { mime, qualities } of mimeCandidates) {
      for (const q of qualities) {
        const blob = await canvasToBlob(img, width, height, mime, q);
        if (blob && blob.size > 0 && blob.size <= maxBytes) {
          return new File([blob], withExtension(file.name, mime), {
            type: mime,
            lastModified: Date.now(),
          });
        }
      }
    }
    longEdge = Math.round(longEdge * 0.82);
  }

  const minScale = LONG_EDGE_MIN / Math.max(iw, ih);
  const wLast = Math.max(1, Math.round(iw * minScale));
  const hLast = Math.max(1, Math.round(ih * minScale));
  const last = await canvasToBlob(img, wLast, hLast, "image/jpeg", 0.42);
  if (last && last.size <= maxBytes) {
    return new File([last], withExtension(file.name, "image/jpeg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  throw new Error(
    "Could not compress this image under the size limit. Try a smaller image or a different format."
  );
}
