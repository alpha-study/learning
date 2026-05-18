import { ApiError, apiDeleteJsonAuth } from "./client";

/** DELETE /api/course/assessment/delete/{id} */
export const DELETE_ASSESSMENT_PATH_PREFIX = "/api/course/assessment/delete";

const DELETE_ASSESSMENT_TIMEOUT_MS = 60_000;

/** Response shape, e.g. `{ "message": "Assessment deleted successfully" }`. */
export type DeleteAssessmentApiResponse = {
  message?: string;
};

export function deleteAssessmentPath(assessmentId: string | number): string {
  const id = String(assessmentId).trim();
  const custom = import.meta.env.VITE_COURSE_ASSESSMENT_DELETE_PATH?.trim();
  if (custom) {
    return custom.includes("{id}")
      ? custom.replace(/\{id\}/g, encodeURIComponent(id))
      : `${custom.replace(/\/+$/, "")}/${encodeURIComponent(id)}`;
  }
  return `${DELETE_ASSESSMENT_PATH_PREFIX}/${encodeURIComponent(id)}`;
}

/**
 * DELETE /api/course/assessment/delete/{id} — removes a chapter quiz or graduation exam.
 * Bearer auth. Example: `/api/course/assessment/delete/1`.
 */
export async function deleteCourseAssessment(
  assessmentId: string | number
): Promise<DeleteAssessmentApiResponse> {
  const id = String(assessmentId).trim();
  if (!id) {
    throw new Error("Assessment id is required to delete.");
  }
  return apiDeleteJsonAuth<DeleteAssessmentApiResponse>(deleteAssessmentPath(id), {
    timeoutMs: DELETE_ASSESSMENT_TIMEOUT_MS,
  });
}

export function extractDeleteAssessmentMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
}

export function getDeleteAssessmentErrorMessage(error: unknown): string {
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
      return "This assessment was not found. It may already have been removed.";
    }
    return `Could not delete assessment (${error.status})`;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out. Check your network and try again.";
  }
  if (error instanceof TypeError) {
    return "Could not reach the API. Check your connection or dev proxy / CORS.";
  }
  if (error instanceof Error) return error.message;
  return "Could not delete assessment";
}
