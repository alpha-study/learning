import { applyAssessmentSnapshots } from "@/lib/assessment-snapshot-storage";
import { ApiError, apiGetJson } from "./client";
import {
  COURSE_ASSESSMENT_TYPE_MCQ,
  fetchCourseByIdRaw,
  graduationAssessmentType,
  parseCourseDetailFromApi,
  resolveCourseMediaSrc,
  type CourseDetail,
} from "./course";

const CURRICULUM_TIMEOUT_MS = 60_000;

/** Row used in wizard + course overview after list/get parsing. */
export interface CourseLectureListItem {
  id: string;
  chapterTitle: string;
  videoPreviewUrl?: string;
  videoFileId?: number;
}

export interface CourseStudyMaterialListItem {
  id: string;
  title: string;
  assetFileId?: number;
  viewUrl?: string;
}

export interface CourseAssessmentQuestionOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface CourseAssessmentQuestion {
  id: string;
  questionText: string;
  questionType?: number;
  options: CourseAssessmentQuestionOption[];
}

/** Parsed assessment from GET /api/course/{courseId}/assessments. */
export interface CourseAssessmentListItem {
  id: string;
  courseLectureId?: string;
  type?: number;
  durationMinutes?: number;
  questions: CourseAssessmentQuestion[];
}

export interface CourseCurriculum {
  lectures: CourseLectureListItem[];
  studyMaterials: CourseStudyMaterialListItem[];
  assessments: CourseAssessmentListItem[];
}

/** Row from GET /api/course/{courseId}/lectures (Postman). */
export interface CourseLectureApiRow {
  id: number;
  courseId: number;
  title: string;
  videoFileId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  videoPath?: { path?: string };
}

/** GET /api/course/{id}/lectures */
export const COURSE_LECTURES_PATH_TEMPLATE = "/api/course/{id}/lectures";

/** GET /api/course/{id}/study_materials */
export const COURSE_STUDY_MATERIALS_PATH_TEMPLATE = "/api/course/{id}/study_materials";

/** Row from GET /api/course/{courseId}/study_materials (Postman). */
export interface CourseStudyMaterialApiRow {
  id: number;
  courseId: number;
  title: string;
  assetFileId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** API typo — `materail` with nested `path`. */
  materail?: { path?: string };
  material?: { path?: string };
}

function courseIdPlaceholder(id: string): string {
  return encodeURIComponent(id.trim());
}

/** Path for GET lectures by course id. Override via `VITE_COURSE_LECTURE_LIST_PATH`. */
export function courseLecturesPath(courseId: string | number): string {
  const id = courseIdPlaceholder(String(courseId).trim());
  const custom = import.meta.env.VITE_COURSE_LECTURE_LIST_PATH?.trim();
  if (custom) {
    if (custom.includes("{id}")) {
      return custom.replace(/\{id\}/g, id);
    }
    return `${custom.replace(/\/+$/, "")}?courseId=${id}`;
  }
  return COURSE_LECTURES_PATH_TEMPLATE.replace("{id}", id);
}

/** Path for GET study materials by course id. Override via `VITE_COURSE_STUDY_MATERIAL_LIST_PATH`. */
export function courseStudyMaterialsPath(courseId: string | number): string {
  const id = courseIdPlaceholder(String(courseId).trim());
  const custom = import.meta.env.VITE_COURSE_STUDY_MATERIAL_LIST_PATH?.trim();
  if (custom) {
    if (custom.includes("{id}")) {
      return custom.replace(/\{id\}/g, id);
    }
    return `${custom.replace(/\/+$/, "")}?courseId=${id}`;
  }
  return COURSE_STUDY_MATERIALS_PATH_TEMPLATE.replace("{id}", id);
}

/** GET /api/course/{id}/assessments */
export const COURSE_ASSESSMENTS_PATH_TEMPLATE = "/api/course/{id}/assessments";

/** Path for GET assessments by course id. Override via `VITE_COURSE_ASSESSMENT_LIST_PATH`. */
export function courseAssessmentsPath(courseId: string | number): string {
  const id = courseIdPlaceholder(String(courseId).trim());
  const custom = import.meta.env.VITE_COURSE_ASSESSMENT_LIST_PATH?.trim();
  if (custom) {
    if (custom.includes("{id}")) {
      return custom.replace(/\{id\}/g, id);
    }
    return `${custom.replace(/\/+$/, "")}?courseId=${id}`;
  }
  return COURSE_ASSESSMENTS_PATH_TEMPLATE.replace("{id}", id);
}

function pickString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

/** Placeholder titles from API or legacy data — not a real chapter name. */
export function isGenericChapterLabel(title: string | undefined): boolean {
  const t = title?.trim() ?? "";
  if (!t) return true;
  if (/^chapter$/i.test(t)) return true;
  if (/^chapter\s*\d+$/i.test(t)) return true;
  if (/^lesson$/i.test(t)) return true;
  if (/^lecture$/i.test(t)) return true;
  return false;
}

/**
 * Chapter name from a lecture row.
 * GET /api/course/{id}/lectures and POST lecture/create both use `title`.
 */
function pickChapterTitleFromLectureRow(row: Record<string, unknown>): string | undefined {
  if (typeof row.chapter === "string" && row.chapter.trim()) {
    return row.chapter.trim();
  }

  const direct = pickString(
    row.title,
    row.chapterTitle,
    row.chapter_title,
    row.chapterName,
    row.chapter_name,
    row.lectureTitle,
    row.lecture_title,
    row.lectureName,
    row.lecture_name,
    row.name,
    row.label,
    row.displayName,
    row.display_name
  );
  if (direct) return direct;

  for (const key of [
    "lecture",
    "courseLecture",
    "course_lecture",
    "lesson",
    "chapter",
    "attributes",
    "meta",
    "metadata",
  ] as const) {
    const inner = row[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const nested = pickChapterTitleFromLectureRow(inner as Record<string, unknown>);
      if (nested) return nested;
    }
  }
  return undefined;
}

/** Map GET /api/course/{courseId}/lectures row → UI list item. */
export function mapLectureApiRowToListItem(
  row: Record<string, unknown>
): CourseLectureListItem | null {
  if (row.deletedAt != null) return null;

  const id = pickString(
    row.id,
    row.course_lecture_id,
    row.courseLectureId,
    row.lecture_id,
    row.lectureId
  );
  if (!id) return null;

  const chapterTitle = pickChapterTitleFromLectureRow(row) ?? "";
  const videoPath =
    pathFromMediaObject(row.videoPath) ??
    pathFromMediaObject(row.video_path) ??
    mediaPathFromRow(row);

  return {
    id,
    chapterTitle,
    videoPreviewUrl: videoPath ? resolveCourseMediaSrc(videoPath) : undefined,
    videoFileId: pickNumber(
      row.videoFileId,
      row.video_file_id,
      row.assetFileId,
      row.asset_file_id,
      row.fileId,
      row.file_id
    ),
  };
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number.parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function pickBoolean(...values: unknown[]): boolean {
  for (const v of values) {
    if (v === true) return true;
    if (v === 1 || v === "1" || v === "true") return true;
  }
  return false;
}

function collectAnswerIds(...sources: Record<string, unknown>[]): number[] {
  const ids = new Set<number>();
  for (const obj of sources) {
    const single = pickNumber(
      obj.answerId,
      obj.answer_id,
      obj.correctAnswerId,
      obj.correct_answer_id
    );
    if (single != null) ids.add(single);

    for (const key of [
      "answerIds",
      "answer_ids",
      "correctAnswerIds",
      "correct_answer_ids",
    ] as const) {
      const raw = obj[key];
      if (!Array.isArray(raw)) continue;
      for (const item of raw) {
        if (typeof item === "number" && Number.isFinite(item)) {
          ids.add(item);
          continue;
        }
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const nested = pickNumber(
            (item as Record<string, unknown>).id,
            (item as Record<string, unknown>).answerId,
            (item as Record<string, unknown>).answer_id
          );
          if (nested != null) ids.add(nested);
          continue;
        }
        const parsed = pickNumber(item);
        if (parsed != null) ids.add(parsed);
      }
    }
  }
  return [...ids];
}

function isOptionMarkedCorrect(
  opt: Record<string, unknown>,
  optId: number | undefined,
  answerIds: number[]
): boolean {
  if (
    pickBoolean(
      opt.isCorrect,
      opt.is_correct,
      opt.correct,
      opt.isAnswer,
      opt.is_answer
    )
  ) {
    return true;
  }
  if (optId != null && answerIds.includes(optId)) return true;
  const optAnswerId = pickNumber(opt.answerId, opt.answer_id);
  if (optAnswerId != null && answerIds.includes(optAnswerId)) return true;
  return false;
}

function pathFromMediaObject(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const path = (value as { path?: unknown }).path;
  if (typeof path === "string" && path.trim()) return path.trim();
  return undefined;
}

function mediaPathFromRow(row: Record<string, unknown>): string | undefined {
  for (const key of [
    "materail",
    "material",
    "studyMaterial",
    "study_material",
    "assetFile",
    "asset_file",
    "videoPath",
    "video_path",
    "video",
    "asset",
    "file",
    "media",
  ]) {
    const fromObj = pathFromMediaObject(row[key]);
    if (fromObj) return fromObj;
  }
  const direct = row.path;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return undefined;
}

const API_COLLECTION_KEYS = [
  "lectures",
  "courseLectures",
  "course_lectures",
  "lessons",
  "chapters",
  "items",
  "list",
  "records",
  "content",
  "values",
  "rows",
  "data",
  "result",
  "payload",
  "body",
  "studyMaterials",
  "study_materials",
  "materials",
  "assessments",
] as const;

/** Unwrap list payloads; prefer the largest non-empty array (avoids `{ rows: [], data: [...] }`). */
function extractCollection(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return [];

  const r = data as Record<string, unknown>;
  let best: unknown[] = [];

  for (const key of API_COLLECTION_KEYS) {
    const v = r[key];
    if (Array.isArray(v)) {
      if (v.length > best.length) best = v;
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = extractCollection(v);
      if (inner.length > best.length) best = inner;
    }
  }

  return best;
}

export function parseLectureListResponse(data: unknown): CourseLectureListItem[] {
  return extractCollection(data)
    .filter((row): row is Record<string, unknown> => row && typeof row === "object")
    .map((row) => mapLectureApiRowToListItem(row))
    .filter((x): x is CourseLectureListItem => x !== null);
}

export function parseStudyMaterialListResponse(
  data: unknown
): CourseStudyMaterialListItem[] {
  return extractCollection(data)
    .filter((row): row is Record<string, unknown> => row && typeof row === "object")
    .filter((row) => row.deletedAt == null)
    .map((row) => {
      const id = pickString(
        row.id,
        row.study_material_id,
        row.studyMaterialId,
        row.material_id,
        row.materialId
      );
      if (!id) return null;
      const titleRaw = pickString(row.title, row.name, row.fileName);
      const title =
        titleRaw && titleRaw.length > 0 ? titleRaw : `Study material ${id}`;
      const path = mediaPathFromRow(row);
      return {
        id,
        title,
        assetFileId: pickNumber(row.assetFileId, row.asset_file_id),
        viewUrl: path ? resolveCourseMediaSrc(path) : undefined,
      } satisfies CourseStudyMaterialListItem;
    })
    .filter((x): x is CourseStudyMaterialListItem => x !== null);
}

function parseAssessmentQuestionOptions(
  questionObj: Record<string, unknown>,
  wrapper?: Record<string, unknown>
): CourseAssessmentQuestionOption[] {
  const optionsRaw = questionObj.options;
  if (!Array.isArray(optionsRaw)) return [];

  const sources = wrapper ? [questionObj, wrapper] : [questionObj];
  const answerIds = collectAnswerIds(...sources);

  return optionsRaw
    .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === "object")
    .filter((o) => o.deletedAt == null)
    .map((opt, index) => {
      const optId = pickNumber(opt.id);
      const id = optId != null ? String(optId) : `opt-${index}`;
      const label =
        pickString(opt.answer, opt.label, opt.text, opt.option) ?? `Option ${index + 1}`;
      return {
        id,
        label,
        isCorrect: isOptionMarkedCorrect(opt, optId, answerIds),
      };
    });
}

function parseAssessmentQuestions(row: Record<string, unknown>): CourseAssessmentQuestion[] {
  const questionsRaw = row.questions;
  if (!Array.isArray(questionsRaw)) return [];

  return questionsRaw
    .filter((q): q is Record<string, unknown> => Boolean(q) && typeof q === "object")
    .filter((q) => q.deletedAt == null)
    .map((qr, index) => {
      const inner = qr.question;
      const qObj =
        inner && typeof inner === "object" && !Array.isArray(inner)
          ? (inner as Record<string, unknown>)
          : qr;
      if (qObj.deletedAt != null) return null;

      const id = pickString(qr.id, qObj.id) ?? `q-${index}`;
      const questionText = pickString(qObj.question, qObj.text, qObj.title) ?? "";
      if (!questionText.trim()) return null;

      return {
        id,
        questionText: questionText.trim(),
        questionType: pickNumber(qObj.questionType, qObj.question_type),
        options: parseAssessmentQuestionOptions(qObj, qr),
      } satisfies CourseAssessmentQuestion;
    })
    .filter((x): x is CourseAssessmentQuestion => x !== null);
}

export function parseAssessmentListResponse(data: unknown): CourseAssessmentListItem[] {
  return extractCollection(data)
    .filter((row): row is Record<string, unknown> => row && typeof row === "object")
    .filter((row) => row.deletedAt == null)
    .map((row) => {
      const id = pickString(row.id, row.assessment_id, row.assessmentId);
      if (!id) return null;
      return {
        id,
        courseLectureId: pickString(
          row.courseLectureId,
          row.course_lecture_id,
          row.lectureId,
          row.lecture_id
        ),
        type: pickNumber(row.type, row.assessment_type, row.assessmentType),
        durationMinutes: pickNumber(row.duration, row.durationMinutes, row.duration_minutes),
        questions: parseAssessmentQuestions(row),
      } satisfies CourseAssessmentListItem;
    })
    .filter((x): x is CourseAssessmentListItem => x !== null);
}

/** Split assessments into graduation (type 2) vs chapter quizzes (type 1). */
export function partitionCourseAssessments(assessments: CourseAssessmentListItem[]): {
  graduationExam?: CourseAssessmentListItem;
  chapterExams: CourseAssessmentListItem[];
} {
  const gradType = graduationAssessmentType();
  const graduationExam = assessments.find((a) => a.type === gradType);
  const chapterExams = assessments.filter((a) => a.type === COURSE_ASSESSMENT_TYPE_MCQ);
  return { graduationExam, chapterExams };
}

export function lectureTitleForAssessment(
  assessment: CourseAssessmentListItem,
  lectures: CourseLectureListItem[]
): string {
  const lectureId = assessment.courseLectureId?.trim();
  if (!lectureId) return "Chapter";
  const lecture = lectures.find((l) => l.id === lectureId);
  const title = lecture?.chapterTitle?.trim();
  if (title && !isGenericChapterLabel(title)) return title;
  return `Lecture ${lectureId}`;
}

function pickLectureChapterTitle(...titles: (string | undefined)[]): string {
  for (const t of titles) {
    const trimmed = t?.trim() ?? "";
    if (trimmed && !isGenericChapterLabel(trimmed)) return trimmed;
  }
  for (const t of titles) {
    const trimmed = t?.trim() ?? "";
    if (trimmed) return trimmed;
  }
  return "";
}

/** Prefer the first non-empty chapter title between two parsed lecture lists (by id, then index). */
export function mergeLectureListItems(
  primary: CourseLectureListItem[],
  secondary: CourseLectureListItem[]
): CourseLectureListItem[] {
  if (primary.length === 0) return secondary;
  if (secondary.length === 0) return primary;

  const secondaryById = new Map(secondary.map((l) => [String(l.id), l]));

  const merged = primary.map((lec, index) => {
    const other = secondaryById.get(String(lec.id)) ?? secondary[index];
    if (!other) return lec;
    return {
      ...lec,
      chapterTitle: pickLectureChapterTitle(lec.chapterTitle, other.chapterTitle),
      videoPreviewUrl: lec.videoPreviewUrl ?? other.videoPreviewUrl,
      videoFileId: lec.videoFileId ?? other.videoFileId,
    };
  });

  const primaryIds = new Set(primary.map((l) => String(l.id)));
  for (const lec of secondary) {
    if (!primaryIds.has(String(lec.id))) merged.push(lec);
  }
  return merged;
}

/** Prefer persisted builder names when the API returns a generic or empty chapter title. */
export function enrichLecturesWithPersistedChapterNames(
  lectures: CourseLectureListItem[],
  persistedChapters: { lectureRemoteId?: string; name?: string; lectureSaved?: boolean }[]
): CourseLectureListItem[] {
  if (lectures.length === 0 || persistedChapters.length === 0) return lectures;

  return lectures.map((lec, index) => {
    const match = persistedChapters.find(
      (c) =>
        c.lectureSaved &&
        c.lectureRemoteId &&
        String(c.lectureRemoteId) === String(lec.id)
    );
    const persistedName = match?.name?.trim();
    const apiTitle = lec.chapterTitle?.trim();

    if (apiTitle && !isGenericChapterLabel(apiTitle)) {
      return lec;
    }

    if (persistedName && isGenericChapterLabel(apiTitle)) {
      return { ...lec, chapterTitle: persistedName };
    }
    if (!apiTitle && persistedName) {
      return { ...lec, chapterTitle: persistedName };
    }
    if (!apiTitle) {
      const byIndex = persistedChapters[index]?.name?.trim();
      if (byIndex && !isGenericChapterLabel(byIndex)) {
        return { ...lec, chapterTitle: byIndex };
      }
    }
    return lec;
  });
}

/** Display title for curriculum rows (never the bare word "Chapter"). */
export function displayChapterTitle(
  lecture: Pick<CourseLectureListItem, "chapterTitle"> & { title?: string },
  chapterIndex: number
): string {
  const title = pickLectureChapterTitle(lecture.title, lecture.chapterTitle);
  if (title) return title;
  return `Chapter ${chapterIndex + 1}`;
}

/** Parse lectures nested on GET /api/course/get/{id} when the API includes them. */
export function parseLecturesFromCoursePayload(data: unknown): CourseLectureListItem[] {
  if (!data || typeof data !== "object") return [];
  const r = data as Record<string, unknown>;
  for (const key of ["lectures", "courseLectures", "course_lectures", "lessons", "chapters"]) {
    const parsed = parseLectureListResponse(r[key]);
    if (parsed.length > 0) return parsed;
  }
  return parseLectureListResponse(r);
}

export function parseStudyMaterialsFromCoursePayload(
  data: unknown
): CourseStudyMaterialListItem[] {
  if (!data || typeof data !== "object") return [];
  const r = data as Record<string, unknown>;
  for (const key of [
    "studyMaterials",
    "study_materials",
    "materials",
    "studyMaterial",
  ]) {
    const parsed = parseStudyMaterialListResponse(r[key]);
    if (parsed.length > 0) return parsed;
  }
  return parseStudyMaterialListResponse(r);
}

export function parseAssessmentsFromCoursePayload(
  data: unknown
): CourseAssessmentListItem[] {
  if (!data || typeof data !== "object") return [];
  const r = data as Record<string, unknown>;
  for (const key of ["assessments", "courseAssessments", "course_assessments", "exams"]) {
    const parsed = parseAssessmentListResponse(r[key]);
    if (parsed.length > 0) return parsed;
  }
  return parseAssessmentListResponse(r);
}

async function fetchListOrEmpty<T>(
  path: string | undefined,
  parse: (data: unknown) => T[]
): Promise<T[]> {
  if (!path) return [];
  try {
    const data = await apiGetJson<unknown>(path, { timeoutMs: CURRICULUM_TIMEOUT_MS });
    return parse(data);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) return [];
    throw e;
  }
}

/** GET /api/course/{courseId}/lectures — Bearer auth. */
export async function fetchCourseLectures(
  courseId: string | number
): Promise<CourseLectureListItem[]> {
  const id = String(courseId).trim();
  if (!id) return [];
  try {
    const data = await apiGetJson<unknown>(courseLecturesPath(id), {
      timeoutMs: CURRICULUM_TIMEOUT_MS,
    });
    return parseLectureListResponse(data);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      return [];
    }
    throw e;
  }
}

/** GET /api/course/{courseId}/study_materials — Bearer auth. */
export async function fetchCourseStudyMaterials(
  courseId: string | number
): Promise<CourseStudyMaterialListItem[]> {
  const id = String(courseId).trim();
  if (!id) return [];
  try {
    const data = await apiGetJson<unknown>(courseStudyMaterialsPath(id), {
      timeoutMs: CURRICULUM_TIMEOUT_MS,
    });
    return parseStudyMaterialListResponse(data);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      return [];
    }
    throw e;
  }
}

/** GET /api/course/{courseId}/assessments — Bearer auth. */
export async function fetchCourseAssessments(
  courseId: string | number
): Promise<CourseAssessmentListItem[]> {
  const id = String(courseId).trim();
  if (!id) return [];
  try {
    const data = await apiGetJson<unknown>(courseAssessmentsPath(id), {
      timeoutMs: CURRICULUM_TIMEOUT_MS,
    });
    return applyAssessmentSnapshots(parseAssessmentListResponse(data));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      return [];
    }
    throw e;
  }
}

/** Find one assessment in a list returned by {@link fetchCourseAssessments}. */
export function findCourseAssessmentById(
  assessments: CourseAssessmentListItem[],
  assessmentId: string | number
): CourseAssessmentListItem | undefined {
  const target = String(assessmentId).trim();
  if (!target) return undefined;
  return assessments.find((a) => String(a.id) === target);
}

/** Chapter quizzes linked to a lecture (`type` 1 / MCQ, not graduation). */
export function filterChapterAssessments(
  assessments: CourseAssessmentListItem[],
  courseLectureId: string | number,
  gradType: number = graduationAssessmentType()
): CourseAssessmentListItem[] {
  const lectureId = String(courseLectureId).trim();
  if (!lectureId) return [];
  return assessments.filter(
    (a) => a.type !== gradType && String(a.courseLectureId ?? "") === lectureId
  );
}

/** Graduation / final exam for a course (`type` 2 by default). */
export function findGraduationAssessment(
  assessments: CourseAssessmentListItem[],
  gradType: number = graduationAssessmentType()
): CourseAssessmentListItem | undefined {
  return assessments.find((a) => a.type === gradType);
}

/**
 * GET /api/course/{courseId}/assessments and return one assessment by id.
 * Used for “View assessment” in the course builder.
 */
export async function fetchCourseAssessmentById(
  courseId: string | number,
  assessmentId: string | number
): Promise<CourseAssessmentListItem | null> {
  const assessments = await fetchCourseAssessments(courseId);
  return findCourseAssessmentById(assessments, assessmentId) ?? null;
}

export type CourseViewPageData = {
  course: CourseDetail;
  lectures: CourseLectureListItem[];
  studyMaterials: CourseStudyMaterialListItem[];
  assessments: CourseAssessmentListItem[];
};

/**
 * Course details page data.
 *
 * - `GET /api/course/get/{id}` — title, desc, media, status (no chapter list).
 * - `GET /api/course/{id}/lectures` — chapters; each row's `title` is the chapter name.
 */
export async function fetchCourseViewPageData(
  courseId: string | number
): Promise<CourseViewPageData> {
  const id = String(courseId).trim();
  if (!id) {
    throw new Error("Course id is required.");
  }

  const raw = await fetchCourseByIdRaw(id);
  const course = parseCourseDetailFromApi(raw);
  if (!course) {
    throw new Error("Could not parse course details from the server response.");
  }

  const curriculum = await fetchCourseCurriculum(id, raw);
  return {
    course,
    lectures: curriculum.lectures,
    studyMaterials: curriculum.studyMaterials,
    assessments: curriculum.assessments,
  };
}

/**
 * Load curriculum: optional list endpoints (env) + nested fields on course GET payload.
 */
export async function fetchCourseCurriculum(
  courseId: string | number,
  courseGetPayload?: unknown
): Promise<CourseCurriculum> {
  const id = String(courseId).trim();
  const [listLectures, listMaterials, listAssessments] = await Promise.all([
    fetchCourseLectures(id),
    fetchCourseStudyMaterials(id),
    fetchCourseAssessments(id),
  ]);

  const nestedLectures = courseGetPayload
    ? parseLecturesFromCoursePayload(courseGetPayload)
    : [];
  const nestedMaterials = courseGetPayload
    ? parseStudyMaterialsFromCoursePayload(courseGetPayload)
    : [];
  const nestedAssessments = courseGetPayload
    ? parseAssessmentsFromCoursePayload(courseGetPayload)
    : [];

  const assessments =
    listAssessments.length > 0 ? listAssessments : nestedAssessments;

  const lectures = mergeLectureListItems(listLectures, nestedLectures);

  return {
    lectures,
    studyMaterials: listMaterials.length > 0 ? listMaterials : nestedMaterials,
    assessments: applyAssessmentSnapshots(assessments),
  };
}

export type CourseReviewReadiness = {
  ok: boolean;
  errors: string[];
  mediaComplete: boolean;
  lectureCount: number;
  hasGraduationExam: boolean;
  studyMaterialCount: number;
};

export type CourseReviewReadinessInput = {
  course: CourseDetail;
  curriculum: CourseCurriculum;
  /** Wizard/session fallback when list APIs are empty. */
  localLectureCount?: number;
  localHasGraduationExam?: boolean;
};

/** Server + optional local fallback checks before PATCH request_review. */
export function evaluateCourseReviewReadiness(
  input: CourseReviewReadinessInput
): CourseReviewReadiness {
  const { course, curriculum } = input;
  const errors: string[] = [];

  const hasPromo =
    course.promotionVideoFileId != null &&
    Number.isFinite(course.promotionVideoFileId) &&
    course.promotionVideoFileId > 0;
  const hasCover =
    course.coverThumbnailFileId != null &&
    Number.isFinite(course.coverThumbnailFileId) &&
    course.coverThumbnailFileId > 0;
  const mediaComplete = hasPromo && hasCover;
  if (!mediaComplete) {
    errors.push(
      "Intro video and cover thumbnail must be saved on the server (complete the Media step)."
    );
  }

  const lectureCount = Math.max(
    curriculum.lectures.length,
    input.localLectureCount ?? 0
  );
  if (lectureCount < 1) {
    errors.push(
      "At least one chapter lesson must be saved on the server (use Save lecture on each chapter)."
    );
  }

  const gradType = graduationAssessmentType();
  const hasGraduationFromApi = curriculum.assessments.some(
    (a) => a.type === gradType
  );
  const hasGraduationExam = hasGraduationFromApi || Boolean(input.localHasGraduationExam);
  if (!hasGraduationExam) {
    errors.push(
      "A graduation exam must be saved on the server before submitting for review."
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    mediaComplete,
    lectureCount,
    hasGraduationExam,
    studyMaterialCount: curriculum.studyMaterials.length,
  };
}
