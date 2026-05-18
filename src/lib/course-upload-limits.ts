import { formatFileSize } from "@/lib/utils";

const ONE_GIB_BYTES = 1024 * 1024 * 1024;
const TEN_GIB_BYTES = 10 * ONE_GIB_BYTES;
const DEFAULT_THUMBNAIL_MAX_BYTES = 10 * 1024 * 1024;

export type CourseMediaUploadKind = "promo" | "lecture" | "thumbnail";

function parseEnvMaxBytes(envKey: string): number | undefined {
  const raw = import.meta.env[envKey as keyof ImportMetaEnv];
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

/** Promotion / intro video max (default 1 GB). */
export function getCoursePromoVideoMaxBytes(): number {
  return parseEnvMaxBytes("VITE_COURSE_PROMO_VIDEO_MAX_BYTES") ?? ONE_GIB_BYTES;
}

/** Chapter lecture video max (default 10 GB). */
export function getCourseLectureVideoMaxBytes(): number {
  return parseEnvMaxBytes("VITE_COURSE_LECTURE_VIDEO_MAX_BYTES") ?? TEN_GIB_BYTES;
}

/** Cover thumbnail max (default 10 MB). */
export function getCourseThumbnailMaxBytes(): number {
  return (
    parseEnvMaxBytes("VITE_COURSE_THUMBNAIL_MAX_BYTES") ??
    parseEnvMaxBytes("VITE_COURSE_MEDIA_MAX_FILE_BYTES") ??
    DEFAULT_THUMBNAIL_MAX_BYTES
  );
}

export function getCourseMediaMaxBytesForKind(kind: CourseMediaUploadKind): number {
  switch (kind) {
    case "promo":
      return getCoursePromoVideoMaxBytes();
    case "lecture":
      return getCourseLectureVideoMaxBytes();
    case "thumbnail":
      return getCourseThumbnailMaxBytes();
  }
}

export function getCourseCreateMaxTotalBytes(): number | undefined {
  return parseEnvMaxBytes("VITE_COURSE_CREATE_MAX_TOTAL_BYTES");
}

function mediaKindLabel(kind: CourseMediaUploadKind): string {
  switch (kind) {
    case "promo":
      return "promotion video";
    case "lecture":
      return "lecture video";
    case "thumbnail":
      return "thumbnail";
  }
}

export function getCourseMediaFileOversizedMessage(
  file: File,
  kind: CourseMediaUploadKind
): string | undefined {
  const max = getCourseMediaMaxBytesForKind(kind);
  if (file.size <= max) return undefined;
  return `This ${mediaKindLabel(kind)} is ${formatFileSize(file.size)}, which exceeds the app upload limit of ${formatFileSize(max)}. Choose a smaller file.`;
}

export function getUpload413ServerLimitMessage(
  kind: CourseMediaUploadKind = "promo",
  fileSizeBytes?: number
): string {
  const appMax = formatFileSize(getCourseMediaMaxBytesForKind(kind));
  const filePart =
    fileSizeBytes != null
      ? ` (${formatFileSize(fileSizeBytes)} — under the app limit of ${appMax})`
      : "";
  return (
    `The server blocked this upload (HTTP 413 — nginx “Request Entity Too Large”)${filePart}. ` +
    `This app allows up to ${appMax} for ${mediaKindLabel(kind)}s, but the API host must too. ` +
    `Ask your backend team to raise nginx \`client_max_body_size\` (e.g. 1g promo, 10g lectures).`
  );
}

/** Detect nginx / gateway HTML error pages returned instead of JSON. */
export function inferHttpStatusFromGatewayHtml(
  text: string,
  responseStatus: number
): number | null {
  const lower = text.toLowerCase();
  if (!lower.includes("<html")) return null;
  if (lower.includes("413") || lower.includes("request entity too large")) return 413;
  if (lower.includes("502") || lower.includes("bad gateway")) return 502;
  if (lower.includes("504") || lower.includes("gateway timeout")) return 504;
  if (responseStatus >= 400) return responseStatus;
  return 502;
}

export function isGatewayHtmlResponse(data: unknown): boolean {
  if (typeof data !== "string") return false;
  return inferHttpStatusFromGatewayHtml(data, 200) != null;
}

/** Throw a clear error when the server returned HTML (e.g. nginx 413) instead of JSON. */
export function assertValidUploadResponseBody(
  data: unknown,
  kind: CourseMediaUploadKind,
  fileSizeBytes?: number
): void {
  if (typeof data !== "string") return;
  const status = inferHttpStatusFromGatewayHtml(data, 200);
  if (status === 413) {
    throw new Error(getUpload413ServerLimitMessage(kind, fileSizeBytes));
  }
  if (status != null) {
    throw new Error(
      `Upload failed: the server returned an error page (HTTP ${status}) instead of upload data. Try again or contact support.`
    );
  }
}

export function getInvalidUploadResponseMessage(
  data: unknown,
  kind: CourseMediaUploadKind,
  fileSizeBytes?: number
): string {
  if (typeof data === "string" && isGatewayHtmlResponse(data)) {
    const status = inferHttpStatusFromGatewayHtml(data, 200);
    if (status === 413) return getUpload413ServerLimitMessage(kind, fileSizeBytes);
  }
  return (
    `Upload did not complete: the server response did not include a file id. ` +
    `This usually means the file was too large for nginx or the upload API failed. ` +
    getUpload413ServerLimitMessage(kind, fileSizeBytes)
  );
}

export function getCourseCreateOversizedMessage(
  introVideo: File,
  thumbnail: File
): string | undefined {
  const introOver = getCourseMediaFileOversizedMessage(introVideo, "promo");
  if (introOver) return introOver;
  const thumbOver = getCourseMediaFileOversizedMessage(thumbnail, "thumbnail");
  if (thumbOver) return thumbOver;

  const max =
    getCourseCreateMaxTotalBytes() ??
    getCoursePromoVideoMaxBytes() + getCourseThumbnailMaxBytes();
  const total = introVideo.size + thumbnail.size;
  if (total <= max) return undefined;
  return `Intro video and thumbnail total ${formatFileSize(total)}, which exceeds the limit of ${formatFileSize(max)}. Use smaller files or raise the configured upload limits.`;
}
