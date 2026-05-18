/** Keys for opening `/add-exam` from the course upload wizard (localStorage + URL). */

export type ExamBuilderKind = "chapter" | "graduation";

export interface ExamBuilderContext {
  courseId: string;
  courseLectureId: string;
  kind: ExamBuilderKind;
  /** Local chapter row id when `kind` is `chapter`. */
  chapterLocalId?: string;
  assessmentType?: number;
  durationMinutes?: number;
  /** When editing, delete this server assessment id before POST create. */
  replaceAssessmentRemoteId?: string;
}

export interface ExamSavedResult {
  kind: ExamBuilderKind;
  chapterLocalId?: string;
  assessmentRemoteId?: string;
  durationMinutes?: number;
  savedAt: string;
}

const CONTEXT_KEY = "learning_exam_builder_context_v1";
export const EXAM_SAVED_RESULT_STORAGE_KEY = "learning_exam_saved_result_v1";
const RESULT_KEY = EXAM_SAVED_RESULT_STORAGE_KEY;

function parseExamBuilderContext(
  raw: Partial<ExamBuilderContext> | null | undefined
): ExamBuilderContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const courseId = typeof raw.courseId === "string" ? raw.courseId.trim() : "";
  const courseLectureId =
    typeof raw.courseLectureId === "string" ? raw.courseLectureId.trim() : "";
  if (!courseId || !courseLectureId) return undefined;
  if (raw.kind !== "chapter" && raw.kind !== "graduation") return undefined;
  return {
    courseId,
    courseLectureId,
    kind: raw.kind,
    chapterLocalId:
      typeof raw.chapterLocalId === "string" ? raw.chapterLocalId : undefined,
    assessmentType:
      typeof raw.assessmentType === "number" && Number.isFinite(raw.assessmentType)
        ? raw.assessmentType
        : undefined,
    durationMinutes:
      typeof raw.durationMinutes === "number" &&
      Number.isFinite(raw.durationMinutes) &&
      raw.durationMinutes > 0
        ? raw.durationMinutes
        : undefined,
    replaceAssessmentRemoteId:
      typeof raw.replaceAssessmentRemoteId === "string" &&
      raw.replaceAssessmentRemoteId.trim()
        ? raw.replaceAssessmentRemoteId.trim()
        : undefined,
  };
}

function parseContextFromSearch(): ExamBuilderContext | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("courseId")?.trim() ?? "";
  const courseLectureId = params.get("courseLectureId")?.trim() ?? "";
  const kind = params.get("kind");
  if (!courseId || !courseLectureId) return undefined;
  if (kind !== "chapter" && kind !== "graduation") return undefined;

  const chapterLocalId = params.get("chapterLocalId")?.trim();
  const typeRaw = params.get("type")?.trim();
  const durationRaw = params.get("duration")?.trim();
  const replaceId = params.get("replaceAssessmentId")?.trim();
  const assessmentType = typeRaw ? Number.parseInt(typeRaw, 10) : NaN;
  const durationMinutes = durationRaw ? Number.parseInt(durationRaw, 10) : NaN;

  return parseExamBuilderContext({
    courseId,
    courseLectureId,
    kind,
    chapterLocalId: chapterLocalId || undefined,
    assessmentType: Number.isFinite(assessmentType) ? assessmentType : undefined,
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : undefined,
    replaceAssessmentRemoteId: replaceId || undefined,
  });
}

/** Build `/add-exam` URL with query params (works with `noopener` new tabs). */
export function buildAddExamUrl(ctx: ExamBuilderContext): string {
  const params = new URLSearchParams({
    courseId: ctx.courseId,
    courseLectureId: ctx.courseLectureId,
    kind: ctx.kind,
  });
  if (ctx.chapterLocalId) {
    params.set("chapterLocalId", ctx.chapterLocalId);
  }
  if (ctx.assessmentType != null && Number.isFinite(ctx.assessmentType)) {
    params.set("type", String(ctx.assessmentType));
  }
  if (ctx.durationMinutes != null && ctx.durationMinutes > 0) {
    params.set("duration", String(ctx.durationMinutes));
  }
  if (ctx.replaceAssessmentRemoteId?.trim()) {
    params.set("replaceAssessmentId", ctx.replaceAssessmentRemoteId.trim());
  }
  return `/add-exam?${params.toString()}`;
}

export function setExamBuilderContext(ctx: ExamBuilderContext): void {
  try {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function getExamBuilderContext(): ExamBuilderContext | undefined {
  const fromUrl = parseContextFromSearch();
  if (fromUrl) return fromUrl;

  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (!raw) return undefined;
    return parseExamBuilderContext(JSON.parse(raw) as Partial<ExamBuilderContext>);
  } catch {
    return undefined;
  }
}

export function clearExamBuilderContext(): void {
  try {
    localStorage.removeItem(CONTEXT_KEY);
  } catch {
    /* ignore */
  }
}

export function setExamSavedResult(result: ExamSavedResult): void {
  try {
    localStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

/** Read and remove the saved-exam notification (call when the upload tab regains focus). */
export function consumeExamSavedResult(): ExamSavedResult | undefined {
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return undefined;
    localStorage.removeItem(RESULT_KEY);
    const p = JSON.parse(raw) as Partial<ExamSavedResult>;
    if (p.kind !== "chapter" && p.kind !== "graduation") return undefined;
    const durationRaw = p.durationMinutes;
    const durationMinutes =
      typeof durationRaw === "number" &&
      Number.isFinite(durationRaw) &&
      durationRaw > 0
        ? durationRaw
        : undefined;

    return {
      kind: p.kind,
      chapterLocalId:
        typeof p.chapterLocalId === "string" ? p.chapterLocalId : undefined,
      assessmentRemoteId:
        typeof p.assessmentRemoteId === "string"
          ? p.assessmentRemoteId
          : undefined,
      durationMinutes,
      savedAt:
        typeof p.savedAt === "string" ? p.savedAt : new Date().toISOString(),
    };
  } catch {
    return undefined;
  }
}

/** Notify when another tab saves an exam (localStorage `storage` + window focus). */
export function subscribeExamSavedResult(onResult: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === RESULT_KEY) onResult();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onResult);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onResult);
  };
}
