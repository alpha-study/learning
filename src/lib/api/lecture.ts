import { ApiError, apiDeleteJsonAuth } from "./client";

/** DELETE /api/course/lecture/delete/{id} */
export const DELETE_LECTURE_PATH_PREFIX = "/api/course/lecture/delete";

const DELETE_LECTURE_TIMEOUT_MS = 60_000;

/** Response shape, e.g. `{ "message": "Lecture deleted successfully" }`. */
export type DeleteLectureApiResponse = {
  message?: string;
};

export function deleteLecturePath(lectureId: string | number): string {
  const id = String(lectureId).trim();
  const custom = import.meta.env.VITE_COURSE_LECTURE_DELETE_PATH?.trim();
  if (custom) {
    return custom.includes("{id}")
      ? custom.replace(/\{id\}/g, encodeURIComponent(id))
      : `${custom.replace(/\/+$/, "")}/${encodeURIComponent(id)}`;
  }
  return `${DELETE_LECTURE_PATH_PREFIX}/${encodeURIComponent(id)}`;
}

/**
 * DELETE /api/course/lecture/delete/{id} — removes a saved lecture video on the server.
 * Bearer auth. Example: `/api/course/lecture/delete/2`.
 */
export async function deleteCourseLecture(
  lectureId: string | number
): Promise<DeleteLectureApiResponse> {
  const id = String(lectureId).trim();
  if (!id) {
    throw new Error("Lecture id is required to delete.");
  }
  return apiDeleteJsonAuth<DeleteLectureApiResponse>(deleteLecturePath(id), {
    timeoutMs: DELETE_LECTURE_TIMEOUT_MS,
  });
}

export function extractDeleteLectureMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
}

export function getDeleteLectureErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const b = error.body;
    if (b && typeof b === "object" && b !== null) {
      const msg = (b as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    if (error.status === 401) {
      return "Session expired or not signed in. Please sign in again.";
    }
    if (error.status === 404) {
      return "This lecture was not found. It may already have been removed.";
    }
    return `Could not delete lecture (${error.status})`;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out. Check your network and try again.";
  }
  if (error instanceof TypeError) {
    return "Could not reach the API. Check your connection or dev proxy / CORS.";
  }
  if (error instanceof Error) return error.message;
  return "Could not delete lecture";
}
