import {
  ApiError,
  apiDeleteJsonAuth,
  apiGetJson,
  apiPatchJsonAuth,
  apiPostJsonAuth,
  apiPutJson,
  getApiBaseUrl,
} from "./client";
import { resolveAvatarSrc } from "./account";
import {
  uploadCourseLectureVideo,
  uploadCourseMediaAssets,
  uploadVendorCourseMediaFile,
} from "./media-upload";
import {
  getCourseCreateMaxTotalBytes,
  getCourseCreateOversizedMessage,
  getCourseLectureVideoMaxBytes,
  getCourseMediaFileOversizedMessage,
  getCourseMediaMaxBytesForKind,
  getCoursePromoVideoMaxBytes,
  getCourseThumbnailMaxBytes,
  getUpload413ServerLimitMessage,
  type CourseMediaUploadKind,
} from "@/lib/course-upload-limits";
import { setUploadProgress } from "@/lib/upload-progress";
import { formatFileSize } from "@/lib/utils";

export {
  DELETE_LECTURE_PATH_PREFIX,
  deleteCourseLecture,
  deleteLecturePath,
  extractDeleteLectureMessage,
  getDeleteLectureErrorMessage,
  type DeleteLectureApiResponse,
} from "./lecture";
export {
  DELETE_ASSESSMENT_PATH_PREFIX,
  deleteAssessmentPath,
  deleteCourseAssessment,
  extractDeleteAssessmentMessage,
  getDeleteAssessmentErrorMessage,
  type DeleteAssessmentApiResponse,
} from "./assessment";

export type { CourseMediaUploadKind } from "@/lib/course-upload-limits";
export {
  getCourseCreateMaxTotalBytes,
  getCourseCreateOversizedMessage,
  getCourseLectureVideoMaxBytes,
  getCourseMediaFileOversizedMessage,
  getCourseMediaMaxBytesForKind,
  getCoursePromoVideoMaxBytes,
  getCourseThumbnailMaxBytes,
  getUpload413ServerLimitMessage,
} from "@/lib/course-upload-limits";

/** POST /api/course/create — saves basic info + media file ids (after upload_assets). */
export function createCoursePath(): string {
  const raw = import.meta.env.VITE_COURSE_CREATE_PATH?.trim();
  if (!raw) return "/api/course/create";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export const CREATE_COURSE_PATH = "/api/course/create";

/** GET /api/course/listing — vendor course list (offset, limit, optional status). */
export const COURSE_LISTING_PATH = "/api/course/listing";

/** GET /api/course/counts — dashboard totals and current-month metrics. */
export const COURSE_COUNTS_PATH = "/api/course/counts";

/** GET /api/course/revenue_graph — monthly revenue series for dashboard chart. */
export const COURSE_REVENUE_GRAPH_PATH = "/api/course/revenue_graph";

/** GET /api/course/upload_graph — monthly course upload series for dashboard chart. */
export const COURSE_UPLOAD_GRAPH_PATH = "/api/course/upload_graph";

/** GET /api/course/get/{id} — single course for vendor review. */
export const COURSE_GET_PATH_TEMPLATE = "/api/course/get/{id}";

const CREATE_COURSE_TIMEOUT_MS = 120_000;
const UPDATE_COURSE_TIMEOUT_MS = 120_000;
const LISTING_TIMEOUT_MS = 60_000;
const COUNTS_TIMEOUT_MS = 30_000;
const REVENUE_GRAPH_TIMEOUT_MS = 30_000;
const UPLOAD_GRAPH_TIMEOUT_MS = 30_000;
const GET_COURSE_TIMEOUT_MS = 60_000;

/** Row from GET /api/course/listing (`rows[]`). */
export interface CourseListingRow {
  id: number;
  title: string;
  desc: string;
  language: string;
  price: string;
  sellingPrice: string;
  createdAt: string;
  coverThumbnailFileId: number;
  purchaseCount: number;
  coverThumbnail?: {
    path?: string;
  };
  status?: number;
}

/** Response from GET /api/course/listing. */
export interface CourseListingResponse {
  count: number;
  rows: CourseListingRow[];
}

export interface CourseListingParams {
  offset?: number;
  limit?: number;
  /** Filter by course status when the API supports it. */
  status?: number;
}

export function courseListingPath(): string {
  const raw = import.meta.env.VITE_COURSE_LISTING_PATH?.trim();
  if (!raw) return COURSE_LISTING_PATH;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function buildCourseListingQuery(params: CourseListingParams): string {
  const sp = new URLSearchParams();
  sp.set("offset", String(Math.max(0, params.offset ?? 0)));
  sp.set("limit", String(Math.max(1, params.limit ?? 10)));
  if (params.status !== undefined && Number.isFinite(params.status)) {
    sp.set("status", String(params.status));
  }
  const path = courseListingPath();
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/** GET /api/course/listing?offset=&limit=&status — Bearer auth. */
export async function fetchCourseListing(
  params: CourseListingParams
): Promise<CourseListingResponse> {
  return apiGetJson<CourseListingResponse>(buildCourseListingQuery(params), {
    timeoutMs: LISTING_TIMEOUT_MS,
  });
}

/** Metrics from GET /api/course/counts (`data`). */
export interface CourseCountsData {
  totalCourses: number;
  currentMonthCourses: number;
  totalBuyers: number;
  currentMonthBuyers: number;
  totalRevenue: string;
  currentMonthRevenue: string;
}

/** Envelope from GET /api/course/counts. */
export interface CourseCountsResponse {
  data: CourseCountsData;
}

export function courseCountsPath(): string {
  const raw = import.meta.env.VITE_COURSE_COUNTS_PATH?.trim();
  if (!raw) return COURSE_COUNTS_PATH;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function parseCountField(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function parseRevenueField(value: unknown, fallback = "0.00"): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

/** Normalize GET /api/course/counts (`{ data }` or flat payload). */
export function parseCourseCountsFromApi(data: unknown): CourseCountsData | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;
  const inner = r.data;
  const counts =
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : r;

  return {
    totalCourses: parseCountField(counts.totalCourses),
    currentMonthCourses: parseCountField(counts.currentMonthCourses),
    totalBuyers: parseCountField(counts.totalBuyers),
    currentMonthBuyers: parseCountField(counts.currentMonthBuyers),
    totalRevenue: parseRevenueField(counts.totalRevenue),
    currentMonthRevenue: parseRevenueField(counts.currentMonthRevenue),
  };
}

/** GET /api/course/counts — Bearer auth. */
export async function fetchCourseCounts(): Promise<CourseCountsData> {
  const raw = await apiGetJson<unknown>(courseCountsPath(), {
    timeoutMs: COUNTS_TIMEOUT_MS,
  });
  const parsed = parseCourseCountsFromApi(raw);
  if (!parsed) {
    throw new Error("Could not parse course counts from the server response.");
  }
  return parsed;
}

/** Format dashboard count deltas, e.g. `+12`. */
export function formatCourseCountDelta(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return n >= 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
}

/** One month from GET /api/course/revenue_graph (`data[]`). */
export interface CourseRevenueGraphPoint {
  month: string;
  revenue: number;
}

/** Envelope from GET /api/course/revenue_graph. */
export interface CourseRevenueGraphResponse {
  data: CourseRevenueGraphPoint[];
}

const REVENUE_GRAPH_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Empty 12-month series when the API has not loaded yet. */
export function emptyCourseRevenueGraph(): CourseRevenueGraphPoint[] {
  return REVENUE_GRAPH_MONTHS.map((month) => ({ month, revenue: 0 }));
}

export function courseRevenueGraphPath(): string {
  const raw = import.meta.env.VITE_COURSE_REVENUE_GRAPH_PATH?.trim();
  if (!raw) return COURSE_REVENUE_GRAPH_PATH;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function parseRevenueGraphPoint(item: unknown): CourseRevenueGraphPoint | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const month = typeof row.month === "string" ? row.month.trim() : "";
  if (!month) return null;

  let revenue = 0;
  const rawRevenue = row.revenue;
  if (typeof rawRevenue === "number" && Number.isFinite(rawRevenue)) {
    revenue = rawRevenue;
  } else if (typeof rawRevenue === "string" && rawRevenue.trim()) {
    const n = Number.parseFloat(rawRevenue);
    if (Number.isFinite(n)) revenue = n;
  }

  return { month, revenue };
}

/** Normalize GET /api/course/revenue_graph (`{ data: [...] }` or bare array). */
export function parseCourseRevenueGraphFromApi(data: unknown): CourseRevenueGraphPoint[] | null {
  if (!data) return null;

  let rows: unknown[] | null = null;
  if (Array.isArray(data)) {
    rows = data;
  } else if (typeof data === "object") {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) rows = inner;
  }

  if (!rows) return null;

  const parsed = rows
    .map(parseRevenueGraphPoint)
    .filter((p): p is CourseRevenueGraphPoint => p != null);

  return parsed.length > 0 ? parsed : emptyCourseRevenueGraph();
}

/** GET /api/course/revenue_graph — Bearer auth. */
export async function fetchCourseRevenueGraph(): Promise<CourseRevenueGraphPoint[]> {
  const raw = await apiGetJson<unknown>(courseRevenueGraphPath(), {
    timeoutMs: REVENUE_GRAPH_TIMEOUT_MS,
  });
  const parsed = parseCourseRevenueGraphFromApi(raw);
  if (!parsed) {
    throw new Error("Could not parse revenue graph from the server response.");
  }
  return parsed;
}

/** One month from GET /api/course/upload_graph (`data[]`). */
export interface CourseUploadGraphPoint {
  month: string;
  monthNumber: number;
  totalBooks: number;
}

/** Envelope from GET /api/course/upload_graph. */
export interface CourseUploadGraphResponse {
  data: CourseUploadGraphPoint[];
}

/** Empty 12-month upload series when the API has not loaded yet. */
export function emptyCourseUploadGraph(): CourseUploadGraphPoint[] {
  return REVENUE_GRAPH_MONTHS.map((month, index) => ({
    month,
    monthNumber: index + 1,
    totalBooks: 0,
  }));
}

export function courseUploadGraphPath(): string {
  const raw = import.meta.env.VITE_COURSE_UPLOAD_GRAPH_PATH?.trim();
  if (!raw) return COURSE_UPLOAD_GRAPH_PATH;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function parseUploadGraphPoint(item: unknown): CourseUploadGraphPoint | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const month = typeof row.month === "string" ? row.month.trim() : "";
  if (!month) return null;

  let monthNumber = 0;
  const rawMonthNumber = row.monthNumber;
  if (typeof rawMonthNumber === "number" && Number.isFinite(rawMonthNumber)) {
    monthNumber = rawMonthNumber;
  } else if (typeof rawMonthNumber === "string" && rawMonthNumber.trim()) {
    const n = Number.parseInt(rawMonthNumber, 10);
    if (Number.isFinite(n)) monthNumber = n;
  }

  let totalBooks = 0;
  const rawTotalBooks = row.totalBooks;
  if (typeof rawTotalBooks === "number" && Number.isFinite(rawTotalBooks)) {
    totalBooks = rawTotalBooks;
  } else if (typeof rawTotalBooks === "string" && rawTotalBooks.trim()) {
    const n = Number.parseInt(rawTotalBooks, 10);
    if (Number.isFinite(n)) totalBooks = n;
  }

  return { month, monthNumber, totalBooks };
}

/** Normalize GET /api/course/upload_graph (`{ data: [...] }` or bare array). */
export function parseCourseUploadGraphFromApi(data: unknown): CourseUploadGraphPoint[] | null {
  if (!data) return null;

  let rows: unknown[] | null = null;
  if (Array.isArray(data)) {
    rows = data;
  } else if (typeof data === "object") {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) rows = inner;
  }

  if (!rows) return null;

  const parsed = rows
    .map(parseUploadGraphPoint)
    .filter((p): p is CourseUploadGraphPoint => p != null);

  return parsed.length > 0 ? parsed : emptyCourseUploadGraph();
}

/** GET /api/course/upload_graph — Bearer auth. */
export async function fetchCourseUploadGraph(): Promise<CourseUploadGraphPoint[]> {
  const raw = await apiGetJson<unknown>(courseUploadGraphPath(), {
    timeoutMs: UPLOAD_GRAPH_TIMEOUT_MS,
  });
  const parsed = parseCourseUploadGraphFromApi(raw);
  if (!parsed) {
    throw new Error("Could not parse upload graph from the server response.");
  }
  return parsed;
}

/** Media object on GET /api/course/get/{id} (`coverThumbnail`, `promotionVideo`). */
export interface CourseDetailMedia {
  path?: string;
}

/** Response from GET /api/course/get/{id}. */
export interface CourseDetail {
  id: number;
  title: string;
  desc: string;
  language: string;
  price: string;
  sellingPrice: string;
  promotionVideoFileId: number;
  coverThumbnailFileId: number;
  createdBy: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  coverThumbnail?: CourseDetailMedia;
  promotionVideo?: CourseDetailMedia;
}

export function courseGetPath(id: string | number): string {
  const idStr = String(id).trim();
  const custom = import.meta.env.VITE_COURSE_GET_PATH?.trim();
  if (custom) {
    return custom.includes("{id}")
      ? custom.replace(/\{id\}/g, encodeURIComponent(idStr))
      : `${custom.replace(/\/+$/, "")}/${encodeURIComponent(idStr)}`;
  }
  return COURSE_GET_PATH_TEMPLATE.replace("{id}", encodeURIComponent(idStr));
}

/** GET /api/course/get/{id} — Bearer auth (raw JSON for nested curriculum fields). */
export async function fetchCourseByIdRaw(id: string | number): Promise<unknown> {
  const idStr = String(id).trim();
  if (!idStr) {
    throw new Error("Course id is required.");
  }
  return apiGetJson<unknown>(courseGetPath(idStr), {
    timeoutMs: GET_COURSE_TIMEOUT_MS,
  });
}

/** Normalize GET /api/course/get/{id} (top-level or `{ data: course }`). */
export function parseCourseDetailFromApi(data: unknown): CourseDetail | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;
  const inner = r.data;
  const course =
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : r;
  const id = course.id;
  if (typeof id !== "number" && typeof id !== "string") return null;
  const numericId = typeof id === "number" ? id : Number.parseInt(String(id), 10);
  if (!Number.isFinite(numericId)) return null;

  const statusRaw = course.status;
  const status =
    typeof statusRaw === "number" && Number.isFinite(statusRaw)
      ? statusRaw
      : COURSE_STATUS.DRAFT;

  return {
    ...(course as unknown as CourseDetail),
    id: numericId,
    status,
  };
}

/** GET /api/course/get/{id} — Bearer auth. */
export async function fetchCourseById(id: string | number): Promise<CourseDetail> {
  const data = await fetchCourseByIdRaw(id);
  const parsed = parseCourseDetailFromApi(data);
  if (!parsed) {
    throw new Error("Could not parse course details from the server response.");
  }
  return parsed;
}

/** DELETE /api/course/delete/{id} */
export const DELETE_COURSE_PATH_TEMPLATE = "/api/course/delete/{id}";

const DELETE_COURSE_TIMEOUT_MS = 60_000;

export type DeleteCourseApiResponse = {
  message?: string;
};

export function deleteCoursePath(courseId: string | number): string {
  const id = String(courseId).trim();
  const custom = import.meta.env.VITE_COURSE_DELETE_PATH?.trim();
  if (custom) {
    return custom.includes("{id}")
      ? custom.replace(/\{id\}/g, encodeURIComponent(id))
      : `${custom.replace(/\/+$/, "")}/${encodeURIComponent(id)}`;
  }
  return DELETE_COURSE_PATH_TEMPLATE.replace("{id}", encodeURIComponent(id));
}

/** DELETE /api/course/delete/{id} — e.g. "Course deleted successfully". */
export async function deleteCourse(
  courseId: string | number
): Promise<DeleteCourseApiResponse> {
  const id = String(courseId).trim();
  if (!id) {
    throw new Error("Course id is required to delete.");
  }
  return apiDeleteJsonAuth<DeleteCourseApiResponse>(deleteCoursePath(id), {
    timeoutMs: DELETE_COURSE_TIMEOUT_MS,
  });
}

export function extractDeleteCourseMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
}

/** PUT /api/course/update/{id} */
export const COURSE_UPDATE_PATH_TEMPLATE = "/api/course/update/{id}";

/** JSON body for PUT /api/course/update/{id} (same shape as create). */
export type UpdateCourseRequestBody = CreateCourseRequestBody;

/** Course row in `data` from PUT /api/course/update/{id}. */
export type UpdateCourseData = CreateCourseData;

/** Envelope from PUT /api/course/update/{id}. */
export type UpdateCourseApiResponse = CreateCourseApiResponse;

export function courseUpdatePath(courseId: string | number): string {
  const id = String(courseId).trim();
  const custom = import.meta.env.VITE_COURSE_UPDATE_PATH?.trim();
  if (custom) {
    return custom.includes("{id}")
      ? custom.replace(/\{id\}/g, encodeURIComponent(id))
      : `${custom.replace(/\/+$/, "")}/${encodeURIComponent(id)}`;
  }
  return COURSE_UPDATE_PATH_TEMPLATE.replace("{id}", encodeURIComponent(id));
}

/** PUT /api/course/update/{id} — JSON body, Bearer auth. */
export async function putUpdateCourse(
  courseId: string | number,
  body: UpdateCourseRequestBody
): Promise<UpdateCourseApiResponse> {
  const id = String(courseId).trim();
  if (!id) {
    throw new Error("Course id is required to update.");
  }
  return apiPutJson<UpdateCourseApiResponse>(courseUpdatePath(id), body, {
    timeoutMs: UPDATE_COURSE_TIMEOUT_MS,
  });
}

/** Course cover / lecture / promo paths from the API, e.g. `courses/1/master.m3u8`. */
const COURSE_STORAGE_PATH_PREFIX = /^courses\//i;

function encodeStoragePath(pathOnly: string): string {
  return pathOnly
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function courseMediaAssetsPrefix(): string {
  const raw = import.meta.env.VITE_COURSE_MEDIA_ASSETS_PREFIX?.trim();
  if (!raw) return "/assets";
  return raw.startsWith("/") ? raw.replace(/\/+$/, "") : `/${raw.replace(/\/+$/, "")}`;
}

/**
 * Resolve `courses/...` storage paths to public asset URLs (`/assets/courses/...` on the API host).
 * Falls back to {@link resolveAvatarSrc} for other paths.
 */
export function resolveCourseMediaSrc(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl?.trim()) return undefined;
  const raw = pathOrUrl.trim();
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const pathOnly = raw.replace(/^\/+/, "");
  if (!COURSE_STORAGE_PATH_PREFIX.test(pathOnly)) {
    return resolveAvatarSrc(pathOrUrl);
  }

  const encodedPath = encodeStoragePath(pathOnly);
  const assetsPrefix = courseMediaAssetsPrefix();

  const mediaBase = import.meta.env.VITE_VENDOR_MEDIA_BASE_URL?.trim().replace(/\/+$/, "");
  if (mediaBase) {
    if (mediaBase.startsWith("http")) {
      return `${mediaBase}${assetsPrefix}/${encodedPath}`;
    }
    if (typeof window !== "undefined") {
      const prefix = mediaBase.startsWith("/") ? mediaBase : `/${mediaBase}`;
      return `${window.location.origin}${prefix}${assetsPrefix}/${encodedPath}`;
    }
  }

  const base = getApiBaseUrl().replace(/\/+$/, "");
  if (base.startsWith("http")) {
    try {
      const u = new URL(base);
      return `${u.origin}${assetsPrefix}/${encodedPath}`;
    } catch {
      return `${base}${assetsPrefix}/${encodedPath}`;
    }
  }

  const assetOrigin = import.meta.env.VITE_VENDOR_ASSET_ORIGIN?.trim().replace(/\/+$/, "");
  if (assetOrigin?.startsWith("http")) {
    return `${assetOrigin}${assetsPrefix}/${encodedPath}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${assetsPrefix}/${encodedPath}`;
  }

  return `${assetsPrefix}/${encodedPath}`;
}

/** Relative storage path → display URL for course cover thumbnails. */
export function resolveCourseCoverSrc(pathOrUrl: string | undefined): string | undefined {
  return resolveCourseMediaSrc(pathOrUrl);
}

/** Course lifecycle status from the API (`GET /api/course/get/{id}`, listing). */
export const COURSE_STATUS = {
  PUBLISHED: 1,
  REVIEW: 2,
  DRAFT: 3,
  REJECTED: 4,
} as const;

export type CourseStatus = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

const COURSE_STATUS_LABELS: Record<number, string> = {
  [COURSE_STATUS.PUBLISHED]: "Published",
  [COURSE_STATUS.REVIEW]: "Review",
  [COURSE_STATUS.DRAFT]: "Draft",
  [COURSE_STATUS.REJECTED]: "Rejected",
};

/** Whether PATCH request_review is allowed for this status. */
export function canRequestCourseReview(status: number | undefined): boolean {
  return (
    status === COURSE_STATUS.DRAFT || status === COURSE_STATUS.REJECTED
  );
}

/** User-facing reason when submit for review is blocked. */
export function getCourseReviewBlockMessage(status: number | undefined): string | undefined {
  if (status === COURSE_STATUS.REVIEW) {
    return "This course is already in review. You can keep editing and saving sections, but it cannot be submitted again until review is complete.";
  }
  if (status === COURSE_STATUS.PUBLISHED) {
    return "This course is already published and cannot be submitted for review again.";
  }
  if (status !== undefined && !canRequestCourseReview(status)) {
    return `This course cannot be submitted for review (status: ${formatCourseListingStatus(status)}).`;
  }
  return undefined;
}

/** Map API numeric `status` to a list label; unknown values show as "—". */
export function formatCourseListingStatus(status: number | undefined): string {
  if (status === undefined || !Number.isFinite(status)) return "—";
  return COURSE_STATUS_LABELS[status] ?? "—";
}

/** Tailwind classes for status badges (My Courses, course details, etc.). */
export function courseStatusBadgeClass(status: number | undefined): string {
  const label = formatCourseListingStatus(status);
  const byLabel: Record<string, string> = {
    Published:
      "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
    Draft: "bg-muted text-muted-foreground border border-border",
    Review:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    Rejected: "bg-destructive/10 text-destructive border border-destructive/20",
    "—": "bg-muted text-muted-foreground border border-border",
  };
  return byLabel[label] ?? byLabel["—"];
}

export function formatCourseListingDate(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCourseListingPrice(value: string | undefined): string {
  if (!value?.trim()) return "—";
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

/** JSON body for POST /api/course/create (Postman). */
export interface CreateCourseRequestBody {
  title: string;
  desc: string;
  language: string;
  price: number;
  promotionVideoFileId: number;
  coverThumbnailFileId: number;
  department?: string;
  branch?: string;
  student_class?: string;
}

/** Course row returned in `data` from POST /api/course/create. */
export interface CreateCourseData {
  id: number;
  title: string;
  desc: string;
  language: string;
  price: number;
  sellingPrice?: number;
  promotionVideoFileId: number;
  coverThumbnailFileId: number;
  createdBy?: number;
  status?: number;
  updatedAt?: string;
  createdAt?: string;
}

/** Envelope from POST /api/course/create. */
export interface CreateCourseApiResponse {
  message: string;
  data: CreateCourseData;
}

export type CreateCourseResponse = CreateCourseApiResponse | Record<string, unknown>;

export interface CreateCourseLecturePayload {
  courseId: string;
  chapterTitle: string;
  video: File;
}

export interface AssessmentQuestionOption {
  option: string;
  isCorrect: boolean;
}

export interface AssessmentQuestion {
  question: string;
  options: AssessmentQuestionOption[];
}

/** JSON body for POST /api/course/assessment/create (Postman). */
export interface CreateCourseAssessmentRequestBody {
  courseId: number | string;
  courseLectureId: number | string;
  type: number;
  duration: number;
  questions: AssessmentQuestion[];
}

export interface CreateCourseAssessmentPayload {
  courseId: string;
  /** Server id of the course lecture row — assessment is created against this lecture. */
  courseLectureId: string;
  questions: AssessmentQuestion[];
  /** Assessment type (default: 1). */
  type?: number;
  /** Duration in minutes. */
  duration: number;
}

/** Assessment row in `data` from POST /api/course/assessment/create. */
export interface CreateCourseAssessmentData {
  id: number;
  courseId?: number;
  courseLectureId?: number;
  type?: number;
  duration?: number;
  updatedAt?: string;
  createdAt?: string;
}

export interface CreateCourseAssessmentApiResponse {
  message: string;
  data: CreateCourseAssessmentData;
}

export type CreateCourseAssessmentResponse =
  | CreateCourseAssessmentApiResponse
  | Record<string, unknown>;

export const CREATE_ASSESSMENT_PATH = "/api/course/assessment/create";

/** Default `type` for chapter quizzes on POST /api/course/assessment/create (Postman uses 1). */
export const COURSE_ASSESSMENT_TYPE_MCQ = 1;

/** Default `type` for graduation / final exam (override via `VITE_COURSE_ASSESSMENT_TYPE_GRADUATION`). */
export const COURSE_ASSESSMENT_TYPE_GRADUATION = 2;

export function graduationAssessmentType(): number {
  const raw = import.meta.env.VITE_COURSE_ASSESSMENT_TYPE_GRADUATION?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return COURSE_ASSESSMENT_TYPE_GRADUATION;
}

/** Shared basic-info fields for create and update flows. */
export interface CourseBasicInfoPayload {
  title: string;
  language: string;
  price: string;
  about: string;
  department?: string;
  branch?: string;
  studentClass?: string;
}

export interface CreateCourseDraftPayload extends CourseBasicInfoPayload {
  introVideo: File;
  thumbnail: File;
}

/** Update flow: new files optional when existing file ids are provided. */
export interface UpdateCourseDraftPayload extends CourseBasicInfoPayload {
  introVideo?: File | null;
  thumbnail?: File | null;
  promotionVideoFileId?: number;
  coverThumbnailFileId?: number;
}

const CREATE_LECTURE_TIMEOUT_MS = 120_000;
const CREATE_ASSESSMENT_TIMEOUT_MS = 120_000;

/** POST /api/course/lecture/create — chapter title + uploaded video file id. */
export const CREATE_LECTURE_PATH = "/api/course/lecture/create";

export function createLecturePath(): string {
  const raw = import.meta.env.VITE_COURSE_LECTURE_CREATE_PATH?.trim();
  if (!raw) return CREATE_LECTURE_PATH;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/** JSON body for POST /api/course/lecture/create (after upload_assets → fileId). */
export interface CreateLectureRequestBody {
  courseId: number | string;
  chapterTitle: string;
  /** Uploaded lecture video id from POST /api/course/upload_assets. */
  videoFileId: number;
}

/** Lecture row in `data` from POST /api/course/lecture/create. */
export interface CreateLectureData {
  id: number;
  courseId?: number;
  course_id?: number;
  chapterTitle?: string;
  chapter_title?: string;
  videoFileId?: number;
  fileId?: number;
  courseLectureId?: number;
  course_lecture_id?: number;
}

/** Envelope from POST /api/course/lecture/create. */
export interface CreateLectureApiResponse {
  message: string;
  data: CreateLectureData;
}

export type CreateLectureResponse =
  | CreateLectureApiResponse
  | Record<string, unknown>;

function lectureJsonCourseIdKey(): string {
  return (
    import.meta.env.VITE_COURSE_LECTURE_CREATE_JSON_COURSE_ID_FIELD?.trim() ||
    "courseId"
  );
}

function lectureJsonChapterTitleKey(): string {
  return (
    import.meta.env.VITE_COURSE_LECTURE_CREATE_JSON_CHAPTER_TITLE_FIELD?.trim() ||
    "chapterTitle"
  );
}

function lectureJsonVideoFileIdKey(): string {
  return (
    import.meta.env.VITE_COURSE_LECTURE_CREATE_JSON_VIDEO_FILE_ID_FIELD?.trim() ||
    "videoFileId"
  );
}

function parseCourseIdForJson(raw: string): number | string {
  const t = raw.trim();
  const n = Number.parseInt(t, 10);
  if (Number.isFinite(n) && String(n) === t) return n;
  return t;
}

function promotionVideoFileIdJsonKey(): string {
  return (
    import.meta.env.VITE_COURSE_CREATE_PROMOTION_VIDEO_FILE_ID_JSON_KEY?.trim() ||
    "promotionVideoFileId"
  );
}

function coverThumbnailFileIdJsonKey(): string {
  return (
    import.meta.env.VITE_COURSE_CREATE_COVER_FILE_ID_JSON_KEY?.trim() ||
    "coverThumbnailFileId"
  );
}

/** JSON body key for course "about" on POST /api/course/create when using file-id flow. */
function jsonDescKey(): string {
  return import.meta.env.VITE_COURSE_CREATE_JSON_DESC_FIELD?.trim() || "desc";
}

function parsePriceNum(raw: string): number {
  const priceNum = Number.parseFloat(raw.trim());
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    throw new Error("Price must be a valid number.");
  }
  return priceNum;
}

/** Build JSON body for POST /api/course/create or PUT /api/course/update/{id}. */
export function buildCreateCourseRequestBody(
  payload: CourseBasicInfoPayload,
  priceNum: number,
  fileIds: { promotionVideoFileId: number; coverThumbnailFileId: number }
): CreateCourseRequestBody {
  const body: Record<string, unknown> = {
    title: payload.title.trim(),
    [jsonDescKey()]: payload.about.trim(),
    language: payload.language.trim(),
    price: priceNum,
    [promotionVideoFileIdJsonKey()]: fileIds.promotionVideoFileId,
    [coverThumbnailFileIdJsonKey()]: fileIds.coverThumbnailFileId,
  };
  if (payload.department?.trim()) {
    body.department = payload.department.trim();
  }
  if (payload.branch?.trim()) {
    body.branch = payload.branch.trim();
  }
  if (payload.studentClass?.trim()) {
    body.student_class = payload.studentClass.trim();
  }
  return body as CreateCourseRequestBody;
}

/** POST /api/course/create — JSON body, Bearer auth. */
export async function postCreateCourse(
  body: CreateCourseRequestBody
): Promise<CreateCourseApiResponse> {
  return apiPostJsonAuth<CreateCourseApiResponse>(createCoursePath(), body, {
    timeoutMs: CREATE_COURSE_TIMEOUT_MS,
  });
}

/** Success message from create response, e.g. "Course created successfully". */
export function extractCreateCourseMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
}

/** Parsed `data` object from POST /api/course/create. */
export function extractCreateCourseData(data: unknown): CreateCourseData | undefined {
  if (!data || typeof data !== "object") return undefined;
  const r = data as Record<string, unknown>;
  const inner = r.data;
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return undefined;
  const d = inner as Record<string, unknown>;
  const id = d.id;
  if (typeof id !== "number" && typeof id !== "string") return undefined;
  return inner as CreateCourseData;
}

/** Success message from update response, e.g. "Course updated successfully". */
export function extractUpdateCourseMessage(data: unknown): string | undefined {
  return extractCreateCourseMessage(data);
}

/** Parsed `data` from PUT /api/course/update/{id}. */
export function extractUpdateCourseData(data: unknown): CreateCourseData | undefined {
  return extractCreateCourseData(data);
}

/** Resolve media file ids for update (upload new files or keep existing ids). */
export async function resolveUpdateCourseMediaFileIds(
  payload: UpdateCourseDraftPayload
): Promise<{ promotionVideoFileId: number; coverThumbnailFileId: number }> {
  let promotionVideoFileId = payload.promotionVideoFileId;
  let coverThumbnailFileId = payload.coverThumbnailFileId;

  const uploadSteps = [payload.introVideo, payload.thumbnail].filter(Boolean).length;
  const sliceSize = uploadSteps > 0 ? Math.floor(90 / uploadSteps) : 0;
  let sliceStart = 0;

  if (payload.introVideo) {
    const sliceEnd = sliceStart + sliceSize;
    promotionVideoFileId = await uploadVendorCourseMediaFile(payload.introVideo, "promo", {
      label: "Uploading intro video…",
      startPercent: sliceStart,
      endPercent: sliceEnd,
    });
    sliceStart = sliceEnd;
  }
  if (payload.thumbnail) {
    coverThumbnailFileId = await uploadVendorCourseMediaFile(payload.thumbnail, "thumbnail", {
      label: "Uploading cover thumbnail…",
      startPercent: sliceStart,
      endPercent: 90,
    });
  }

  if (
    promotionVideoFileId == null ||
    !Number.isFinite(promotionVideoFileId) ||
    coverThumbnailFileId == null ||
    !Number.isFinite(coverThumbnailFileId)
  ) {
    throw new Error(
      "Promotion video and cover thumbnail are required. Upload new files or keep the existing media."
    );
  }

  return { promotionVideoFileId, coverThumbnailFileId };
}

/**
 * Save basic information + media: upload_assets as needed → PUT /api/course/update/{id}.
 */
export async function updateCourseWithBasicInfoAndMedia(
  courseId: string | number,
  payload: UpdateCourseDraftPayload
): Promise<UpdateCourseApiResponse> {
  setUploadProgress({ label: "Saving course…", percent: 0 });
  try {
    const priceNum = parsePriceNum(payload.price);
    const fileIds = await resolveUpdateCourseMediaFileIds(payload);
    setUploadProgress({ label: "Saving course details…", percent: 92 });
    const body = buildCreateCourseRequestBody(payload, priceNum, fileIds);
    return await putUpdateCourse(courseId, body);
  } finally {
    setUploadProgress(null);
  }
}

/**
 * Save basic information + media: upload_assets (×2) → POST /api/course/create.
 */
export async function createCourseWithBasicInfoAndMedia(
  payload: CreateCourseDraftPayload
): Promise<CreateCourseApiResponse> {
  setUploadProgress({ label: "Uploading intro video…", percent: 0 });
  try {
    const priceNum = parsePriceNum(payload.price);
    const fileIds = await uploadCourseMediaAssets(
      payload.introVideo,
      payload.thumbnail
    );
    setUploadProgress({ label: "Saving course…", percent: 92 });
    const body = buildCreateCourseRequestBody(payload, priceNum, fileIds);
    return await postCreateCourse(body);
  } finally {
    setUploadProgress(null);
  }
}

/** @alias {@link createCourseWithBasicInfoAndMedia} */
export async function createCourseDraft(
  payload: CreateCourseDraftPayload
): Promise<CreateCourseResponse> {
  return createCourseWithBasicInfoAndMedia(payload);
}

/** Best-effort course id from create response for later steps. */
export function extractCourseIdFromCreateResponse(
  data: unknown
): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const r = data as Record<string, unknown>;
  const pick = (o: Record<string, unknown>) => {
    const id =
      o.id ??
      o.course_id ??
      o.courseId ??
      o.vendor_course_id ??
      o.vendorCourseId;
    if (typeof id === "string" && id.trim()) return id.trim();
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
    return undefined;
  };
  const direct = pick(r);
  if (direct) return direct;
  const nestKeys = ["data", "course", "result", "payload"] as const;
  for (const nest of nestKeys) {
    const inner = r[nest];
    if (inner && typeof inner === "object" && inner !== null) {
      const nested = pick(inner as Record<string, unknown>);
      if (nested) return nested;
    }
  }
  const dataObj = r.data;
  if (dataObj && typeof dataObj === "object" && dataObj !== null) {
    const d = dataObj as Record<string, unknown>;
    for (const innerKey of ["course", "result", "payload"] as const) {
      const inner = d[innerKey];
      if (inner && typeof inner === "object" && inner !== null) {
        const p = pick(inner as Record<string, unknown>);
        if (p) return p;
      }
    }
  }
  return undefined;
}

/** Success message from lecture create, e.g. "Lecture created successfully". */
export function extractCreateLectureMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
}

/** Parsed `data` from POST /api/course/lecture/create. */
export function extractCreateLectureData(data: unknown): CreateLectureData | undefined {
  if (!data || typeof data !== "object") return undefined;
  const inner = (data as { data?: unknown }).data;
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return undefined;
  const d = inner as Record<string, unknown>;
  const id = d.id ?? d.course_lecture_id ?? d.courseLectureId ?? d.lecture_id ?? d.lectureId;
  if (typeof id !== "number" && typeof id !== "string") return undefined;
  return inner as CreateLectureData;
}

/** Lecture id from POST /api/course/lecture/create (`data.id` or equivalent). */
export function extractLectureIdFromCreateResponse(data: unknown): string | undefined {
  const fromData = extractCreateLectureData(data);
  if (fromData) {
    const id =
      fromData.id ??
      fromData.course_lecture_id ??
      fromData.courseLectureId ??
      fromData.lecture_id ??
      fromData.lectureId;
    if (typeof id === "string" && id.trim()) return id.trim();
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
  }
  if (!data || typeof data !== "object") return undefined;
  const r = data as Record<string, unknown>;
  const pick = (o: Record<string, unknown>) => {
    const id =
      o.course_lecture_id ??
      o.courseLectureId ??
      o.lecture_id ??
      o.lectureId ??
      o.lesson_id ??
      o.lessonId ??
      o.id;
    if (typeof id === "string" && id.trim()) return id.trim();
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
    return undefined;
  };
  const direct = pick(r);
  if (direct) return direct;
  for (const nest of ["data", "lecture", "lesson"]) {
    const inner = r[nest];
    if (inner && typeof inner === "object" && inner !== null) {
      const nested = pick(inner as Record<string, unknown>);
      if (nested) return nested;
    }
  }
  return undefined;
}

/** Parsed `data` from POST /api/course/assessment/create (`data.id`, etc.). */
export function extractCreateAssessmentData(
  data: unknown
): CreateCourseAssessmentData | undefined {
  if (!data || typeof data !== "object") return undefined;
  const inner = (data as { data?: unknown }).data;
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return undefined;
  const d = inner as Record<string, unknown>;
  const id = d.id;
  if (typeof id !== "number" && typeof id !== "string") return undefined;
  return inner as CreateCourseAssessmentData;
}

/** Assessment id from POST /api/course/assessment/create (`data.id` or equivalent). */
export function extractAssessmentIdFromCreateResponse(
  data: unknown
): string | undefined {
  const fromData = extractCreateAssessmentData(data);
  if (fromData) {
    const id = fromData.id;
    if (typeof id === "string" && id.trim()) return id.trim();
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
  }

  if (!data || typeof data !== "object") return undefined;
  const r = data as Record<string, unknown>;
  const pick = (o: Record<string, unknown>) => {
    const id =
      o.assessment_id ??
      o.assessmentId ??
      o.quiz_id ??
      o.quizId ??
      o.exam_id ??
      o.examId ??
      o.id;
    if (typeof id === "string" && id.trim()) return id.trim();
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
    return undefined;
  };
  const direct = pick(r);
  if (direct) return direct;
  for (const nest of ["data", "assessment", "quiz", "exam"]) {
    const inner = r[nest];
    if (inner && typeof inner === "object" && inner !== null) {
      const nested = pick(inner as Record<string, unknown>);
      if (nested) return nested;
    }
  }
  return undefined;
}

export function assessmentCreatePath(): string {
  const raw = import.meta.env.VITE_COURSE_ASSESSMENT_CREATE_PATH?.trim();
  if (!raw) return CREATE_ASSESSMENT_PATH;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function buildCreateCourseAssessmentRequestBody(
  payload: CreateCourseAssessmentPayload
): CreateCourseAssessmentRequestBody {
  const typeRaw = import.meta.env.VITE_COURSE_ASSESSMENT_TYPE?.trim();
  const typeFromEnv = typeRaw ? Number.parseInt(typeRaw, 10) : NaN;
  const type =
    payload.type ??
    (Number.isFinite(typeFromEnv) ? typeFromEnv : COURSE_ASSESSMENT_TYPE_MCQ);

  return {
    courseId: parseCourseIdForJson(payload.courseId),
    courseLectureId: parseCourseIdForJson(payload.courseLectureId),
    type,
    duration: payload.duration,
    questions: payload.questions,
  };
}

/** Success message from assessment create, e.g. "Assessment created successfully". */
export function extractCreateAssessmentMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
}

/**
 * POST /api/course/assessment/create — JSON body with questions (Postman).
 * Response: `{ message, data: { id, courseId, courseLectureId, type, duration, … } }`.
 */
export async function createCourseAssessment(
  payload: CreateCourseAssessmentPayload
): Promise<CreateCourseAssessmentResponse> {
  const body = buildCreateCourseAssessmentRequestBody(payload);
  return apiPostJsonAuth<CreateCourseAssessmentResponse>(
    assessmentCreatePath(),
    body,
    { timeoutMs: CREATE_ASSESSMENT_TIMEOUT_MS }
  );
}

export function buildCreateLectureRequestBody(
  payload: CreateCourseLecturePayload,
  videoFileId: number
): CreateLectureRequestBody {
  const body: Record<string, unknown> = {
    [lectureJsonCourseIdKey()]: parseCourseIdForJson(payload.courseId),
    [lectureJsonChapterTitleKey()]: payload.chapterTitle.trim(),
    [lectureJsonVideoFileIdKey()]: videoFileId,
  };
  return body as CreateLectureRequestBody;
}

/** POST /api/course/lecture/create — JSON, Bearer auth. */
export async function postCreateLecture(
  body: CreateLectureRequestBody
): Promise<CreateLectureApiResponse> {
  return apiPostJsonAuth<CreateLectureApiResponse>(createLecturePath(), body, {
    timeoutMs: CREATE_LECTURE_TIMEOUT_MS,
  });
}

/**
 * Save lecture: POST upload_assets (`assetFile` → `fileId`), then POST /api/course/lecture/create.
 */
export async function createCourseLectureWithVideo(
  payload: CreateCourseLecturePayload
): Promise<CreateLectureApiResponse> {
  const chapterLabel = payload.chapterTitle.trim() || "lesson";
  setUploadProgress({ label: `Uploading "${chapterLabel}"…`, percent: 0 });
  try {
    const videoFileId = await uploadCourseLectureVideo(payload.video, {
      label: `Uploading "${chapterLabel}"…`,
      startPercent: 0,
      endPercent: 88,
    });
    setUploadProgress({ label: "Saving lesson…", percent: 92 });
    const body = buildCreateLectureRequestBody(payload, videoFileId);
    return await postCreateLecture(body);
  } finally {
    setUploadProgress(null);
  }
}

/** @alias {@link createCourseLectureWithVideo} */
export async function createCourseLecture(
  payload: CreateCourseLecturePayload
): Promise<CreateLectureResponse> {
  return createCourseLectureWithVideo(payload);
}

/** PATCH /api/courses/{id}/request_review — submit course for review (Review step). */
export const COURSE_REQUEST_REVIEW_PATH_TEMPLATE =
  "/api/courses/{id}/request_review";

const REQUEST_REVIEW_TIMEOUT_MS = 60_000;

export type RequestCourseReviewApiResponse = {
  message?: string;
  data?: unknown;
};

export function requestCourseReviewPath(courseId: string | number): string {
  const id = String(courseId).trim();
  const custom = import.meta.env.VITE_COURSE_REQUEST_REVIEW_PATH?.trim();
  if (custom) {
    return custom.includes("{id}")
      ? custom.replace(/\{id\}/g, encodeURIComponent(id))
      : `${custom.replace(/\/+$/, "")}/${encodeURIComponent(id)}/request_review`;
  }
  return COURSE_REQUEST_REVIEW_PATH_TEMPLATE.replace(
    "{id}",
    encodeURIComponent(id)
  );
}

/**
 * PATCH /api/courses/{courseId}/request_review — moves course to in-review after builder submit.
 */
export async function requestCourseReview(
  courseId: string | number
): Promise<RequestCourseReviewApiResponse> {
  const id = String(courseId).trim();
  if (!id) {
    throw new Error("Course id is required to request review.");
  }
  return apiPatchJsonAuth<RequestCourseReviewApiResponse>(
    requestCourseReviewPath(id),
    {},
    { timeoutMs: REQUEST_REVIEW_TIMEOUT_MS }
  );
}

export function extractRequestCourseReviewMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const msg = (data as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg.trim() : undefined;
}

export function getCourseCreateErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
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
        if (messages.length > 0) {
          const shown = messages.slice(0, 5);
          const suffix =
            messages.length > shown.length ? ` (+${messages.length - shown.length} more)` : "";
          return `${shown.join(" ")}${suffix}`;
        }
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
