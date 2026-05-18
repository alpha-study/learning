import { ApiError, apiDeleteJsonAuth, apiPostJsonAuth } from "./client";
import { uploadVendorCourseMediaFile } from "./media-upload";
import { setUploadProgress } from "@/lib/upload-progress";

export const CREATE_STUDY_MATERIAL_PATH = "/api/course/study_material/create";
export const DELETE_STUDY_MATERIAL_PATH_PREFIX = "/api/course/study_material/delete";

const CREATE_STUDY_MATERIAL_TIMEOUT_MS = 120_000;

/** JSON body for POST /api/course/study_material/create (Postman). */
export interface CreateStudyMaterialRequestBody {
  courseId: number | string;
  assetFileId: number;
  title?: string;
}

export interface CreateStudyMaterialData {
  id: number;
  courseId?: number;
  title?: string;
  assetFileId?: number;
  updatedAt?: string;
  createdAt?: string;
}

export interface CreateStudyMaterialApiResponse {
  message: string;
  data: CreateStudyMaterialData;
}

export type CreateStudyMaterialResponse =
  | CreateStudyMaterialApiResponse
  | Record<string, unknown>;

export type DeleteStudyMaterialApiResponse = {
  message?: string;
};

function parseCourseIdForJson(raw: string): number | string {
  const t = raw.trim();
  const n = Number.parseInt(t, 10);
  if (Number.isFinite(n) && String(n) === t) return n;
  return t;
}

export function studyMaterialCreatePath(): string {
  const raw = import.meta.env.VITE_COURSE_STUDY_MATERIAL_CREATE_PATH?.trim();
  if (!raw) return CREATE_STUDY_MATERIAL_PATH;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function deleteStudyMaterialPath(materialId: string | number): string {
  const id = String(materialId).trim();
  const custom = import.meta.env.VITE_COURSE_STUDY_MATERIAL_DELETE_PATH?.trim();
  if (custom) {
    return custom.includes("{id}")
      ? custom.replace(/\{id\}/g, encodeURIComponent(id))
      : `${custom.replace(/\/+$/, "")}/${encodeURIComponent(id)}`;
  }
  return `${DELETE_STUDY_MATERIAL_PATH_PREFIX}/${encodeURIComponent(id)}`;
}

export function buildCreateStudyMaterialRequestBody(
  courseId: string,
  assetFileId: number,
  title?: string
): CreateStudyMaterialRequestBody {
  const body: CreateStudyMaterialRequestBody = {
    courseId: parseCourseIdForJson(courseId),
    assetFileId,
  };
  const t = title?.trim();
  if (t) body.title = t;
  return body;
}

/** POST /api/course/study_material/create — JSON, Bearer auth. */
export async function postCreateStudyMaterial(
  body: CreateStudyMaterialRequestBody
): Promise<CreateStudyMaterialApiResponse> {
  return apiPostJsonAuth<CreateStudyMaterialApiResponse>(
    studyMaterialCreatePath(),
    body,
    { timeoutMs: CREATE_STUDY_MATERIAL_TIMEOUT_MS }
  );
}

export function extractCreateStudyMaterialMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
}

export function extractCreateStudyMaterialData(
  data: unknown
): CreateStudyMaterialData | undefined {
  if (!data || typeof data !== "object") return undefined;
  const inner = (data as { data?: unknown }).data;
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return undefined;
  const d = inner as Record<string, unknown>;
  const id = d.id;
  if (typeof id !== "number" && typeof id !== "string") return undefined;
  return inner as CreateStudyMaterialData;
}

export function extractStudyMaterialIdFromCreateResponse(
  data: unknown
): string | undefined {
  const fromData = extractCreateStudyMaterialData(data);
  if (fromData) {
    const id = fromData.id;
    if (typeof id === "string" && id.trim()) return id.trim();
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
  }
  if (!data || typeof data !== "object") return undefined;
  const r = data as Record<string, unknown>;
  const pick = (o: Record<string, unknown>) => {
    const id =
      o.study_material_id ??
      o.studyMaterialId ??
      o.material_id ??
      o.materialId ??
      o.id;
    if (typeof id === "string" && id.trim()) return id.trim();
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
    return undefined;
  };
  for (const nest of ["data", "study_material", "studyMaterial", "material"]) {
    const inner = r[nest];
    if (inner && typeof inner === "object" && inner !== null) {
      const nested = pick(inner as Record<string, unknown>);
      if (nested) return nested;
    }
  }
  return undefined;
}

/**
 * Upload PDF via upload_assets, then POST /api/course/study_material/create.
 */
export async function createCourseStudyMaterialWithFile(
  courseId: string,
  file: File,
  options?: { title?: string }
): Promise<CreateStudyMaterialApiResponse> {
  const displayName = file.name.trim() || "PDF";
  setUploadProgress({ label: `Uploading ${displayName}…`, percent: 0 });
  try {
    const assetFileId = await uploadVendorCourseMediaFile(file, "promo", {
      label: `Uploading ${displayName}…`,
      startPercent: 0,
      endPercent: 88,
    });
    setUploadProgress({ label: "Saving study material…", percent: 92 });
    const title =
      options?.title?.trim() || file.name.replace(/\.pdf$/i, "").trim() || file.name;
    const body = buildCreateStudyMaterialRequestBody(courseId, assetFileId, title);
    return await postCreateStudyMaterial(body);
  } finally {
    setUploadProgress(null);
  }
}

/** DELETE /api/course/study_material/delete/{id} */
export async function deleteCourseStudyMaterial(
  materialId: string | number
): Promise<DeleteStudyMaterialApiResponse> {
  const id = String(materialId).trim();
  if (!id) {
    throw new Error("Study material id is required to delete.");
  }
  return apiDeleteJsonAuth<DeleteStudyMaterialApiResponse>(deleteStudyMaterialPath(id));
}

export function extractDeleteStudyMaterialMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
}

export function getStudyMaterialErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const b = error.body;
    if (b && typeof b === "object" && b !== null) {
      const msg = (b as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    if (error.status === 401) {
      return "Session expired or not signed in. Please sign in again.";
    }
    return `Request failed (${error.status})`;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out. Check your network and try again.";
  }
  if (error instanceof TypeError) {
    return "Could not reach the API. Check your connection or dev proxy / CORS.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
