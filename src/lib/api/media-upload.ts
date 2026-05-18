import {
  assertValidUploadResponseBody,
  getInvalidUploadResponseMessage,
  getUpload413ServerLimitMessage,
  type CourseMediaUploadKind,
} from "@/lib/course-upload-limits";
import { mapUploadSlice, setUploadProgress } from "@/lib/upload-progress";
import { ApiError, apiPostFormData } from "./client";

export type MediaUploadProgressSlice = {
  label: string;
  startPercent: number;
  endPercent: number;
};

function uploadApiErrorMessage(error: ApiError): string {
  const b = error.body;
  if (b && typeof b === "object" && b !== null) {
    const errs = (b as { errors?: unknown }).errors;
    if (Array.isArray(errs) && errs.length > 0) {
      const messages: string[] = [];
      for (const item of errs) {
        if (
          item &&
          typeof item === "object" &&
          "message" in item &&
          typeof (item as { message: unknown }).message === "string"
        ) {
          const m = (item as { message: string }).message.trim();
          if (m) messages.push(m);
        }
      }
      if (messages.length > 0) return messages.slice(0, 5).join(" ");
    }
    const msg = (b as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (error.status === 401) {
    return "Session expired or not signed in. Please sign in again.";
  }
  if (error.status === 413) {
    return getUpload413ServerLimitMessage("promo");
  }
  return `Upload failed (${error.status})`;
}

const MEDIA_UPLOAD_TIMEOUT_MS = 600_000;

/** POST multipart — promotion video and cover image (same route for both). */
export const COURSE_ASSET_UPLOAD_PATH = "/api/course/upload_assets";

export type CourseMediaAssetIds = {
  promotionVideoFileId: number;
  coverThumbnailFileId: number;
};

function courseAssetUploadPath(): string {
  const raw =
    import.meta.env.VITE_COURSE_MEDIA_UPLOAD_PATH?.trim() ||
    COURSE_ASSET_UPLOAD_PATH;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/** Multipart field name — matches Postman `assetFile`. */
function uploadAssetFileField(): string {
  return import.meta.env.VITE_COURSE_MEDIA_UPLOAD_FIELD?.trim() || "assetFile";
}

function formatBodyPreview(data: unknown): string {
  try {
    if (data == null) return "(empty body)";
    if (typeof data === "string") return data.slice(0, 280);
    return JSON.stringify(data).slice(0, 400);
  } catch {
    return String(data).slice(0, 200);
  }
}

function readTopLevelErrorsMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const errs = (data as { errors?: unknown }).errors;
  if (!Array.isArray(errs) || errs.length === 0) return undefined;
  const parts: string[] = [];
  for (const item of errs) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { message?: unknown }).message === "string"
    ) {
      const m = (item as { message: string }).message.trim();
      if (m) parts.push(m);
    }
  }
  if (parts.length === 0) return undefined;
  return parts.join("; ");
}

function pickNumericId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return parseInt(value.trim(), 10);
  }
  return undefined;
}

/**
 * Parse `fileId` from upload_assets success JSON, e.g.
 * `{ "fileId": 4, "status": 2, "message": "File uploaded successfully" }`.
 */
export function extractNumericFileIdFromUploadResponse(data: unknown): number | undefined {
  if (data == null) return undefined;
  if (typeof data === "number" && Number.isFinite(data)) return Math.trunc(data);
  if (typeof data === "string" && /^\d+$/.test(data.trim())) {
    return parseInt(data.trim(), 10);
  }
  if (typeof data !== "object") return undefined;

  const pick = (o: Record<string, unknown>): number | undefined => {
    const keys = [
      "fileId",
      "file_id",
      "id",
      "mediaId",
      "media_id",
      "uploadId",
      "upload_id",
    ];
    for (const k of keys) {
      const n = pickNumericId(o[k]);
      if (n != null) return n;
    }
    return undefined;
  };

  const r = data as Record<string, unknown>;
  const direct = pick(r);
  if (direct != null) return direct;

  for (const nest of ["data", "file", "result", "payload", "upload", "media", "assets"]) {
    const inner = r[nest];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const n = pick(inner as Record<string, unknown>);
      if (n != null) return n;
    }
  }

  return undefined;
}

async function postCourseAssetFormData(
  fd: FormData,
  kind: "promo" | "lecture" | "thumbnail" = "promo",
  fileSizeBytes?: number,
  progress?: MediaUploadProgressSlice
): Promise<unknown> {
  const path = courseAssetUploadPath();
  if (progress) {
    setUploadProgress({
      label: progress.label,
      percent: progress.startPercent,
    });
  }
  try {
    const data = await apiPostFormData<unknown>(path, fd, {
      timeoutMs: MEDIA_UPLOAD_TIMEOUT_MS,
      onUploadProgress: progress
        ? (loaded, total) => {
            setUploadProgress({
              label: progress.label,
              percent: mapUploadSlice(
                loaded,
                total,
                progress.startPercent,
                progress.endPercent
              ),
            });
          }
        : undefined,
    });
    assertValidUploadResponseBody(data, kind, fileSizeBytes);
    const errMsg = readTopLevelErrorsMessage(data);
    if (errMsg) {
      throw new Error(errMsg);
    }
    return data;
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 413) {
        throw new Error(getUpload413ServerLimitMessage(kind, fileSizeBytes));
      }
      throw new Error(uploadApiErrorMessage(e));
    }
    throw e;
  }
}

/**
 * POST /api/course/upload_assets — one file, form field `assetFile` (Postman).
 * Used for course promo/thumbnail and curriculum lecture videos.
 */
export async function uploadVendorCourseMediaFile(
  file: File,
  kind: CourseMediaUploadKind = "promo",
  progress?: MediaUploadProgressSlice
): Promise<number> {
  const fd = new FormData();
  fd.append(uploadAssetFileField(), file, file.name);

  const data = await postCourseAssetFormData(fd, kind, file.size, progress);
  assertValidUploadResponseBody(data, kind, file.size);
  const id = extractNumericFileIdFromUploadResponse(data);
  if (id != null) return id;
  throw new Error(getInvalidUploadResponseMessage(data, kind, file.size));
}

/**
 * Upload intro video and cover thumbnail — two identical POSTs to `/api/course/upload_assets`
 * (Postman: `assetFile` → `{ fileId, status, message }`). Thumbnail uses the same API as video.
 */
export async function uploadCourseMediaAssets(
  introVideo: File,
  thumbnail: File
): Promise<CourseMediaAssetIds> {
  const promotionVideoFileId = await uploadVendorCourseMediaFile(introVideo, "promo", {
    label: "Uploading intro video…",
    startPercent: 0,
    endPercent: 45,
  });
  const coverThumbnailFileId = await uploadVendorCourseMediaFile(thumbnail, "thumbnail", {
    label: "Uploading cover thumbnail…",
    startPercent: 45,
    endPercent: 90,
  });
  return { promotionVideoFileId, coverThumbnailFileId };
}

/** Upload a curriculum lecture video file → `fileId` from upload_assets. */
export async function uploadCourseLectureVideo(
  file: File,
  progress?: MediaUploadProgressSlice
): Promise<number> {
  return uploadVendorCourseMediaFile(file, "lecture", progress);
}
