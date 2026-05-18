/** Session persistence for the course upload wizard (survives refresh in the same tab). */

export const COURSE_BUILDER_DRAFT_ID_STORAGE_KEY = "learning_course_builder_draft_id";
export const COURSE_BUILDER_FORM_STORAGE_KEY = "learning_course_builder_form_v1";
export const COURSE_BUILDER_CURRICULUM_STORAGE_KEY =
  "learning_course_builder_curriculum_v1";

export type PersistedWizard = {
  currentStep: number;
  title: string;
  language: string;
  price: string;
  about: string;
  coreDepartment: string;
  coreBranch: string;
  coreClass: string;
};

export const WIZARD_DEFAULT: PersistedWizard = {
  currentStep: 1,
  title: "",
  language: "",
  price: "",
  about: "",
  coreDepartment: "",
  coreBranch: "",
  coreClass: "",
};

export type PersistedChapter = {
  id: string;
  name: string;
  lectureSaved: boolean;
  lectureRemoteId?: string;
  /** Server video URL (not a blob URL). */
  videoPreviewUrl?: string;
  assessmentSaved: boolean;
  assessmentRemoteId?: string;
  assessmentDurationMinutes?: number;
};

export type PersistedStudyMaterial = {
  id: string;
  name: string;
  saved: boolean;
  remoteId?: string;
  assetFileId?: number;
  /** Optional server URL to open the PDF. */
  viewUrl?: string;
};

export type PersistedGraduationExam = {
  saved: boolean;
  assessmentRemoteId?: string;
  durationMinutes?: number;
};

export type PersistedCurriculum = {
  chapters: PersistedChapter[];
  studyMaterials: PersistedStudyMaterial[];
  graduationExam: PersistedGraduationExam;
};

type CurriculumStore = Record<string, PersistedCurriculum>;

export function readStoredCourseDraftId(): string | undefined {
  try {
    const s = sessionStorage.getItem(COURSE_BUILDER_DRAFT_ID_STORAGE_KEY)?.trim();
    return s || undefined;
  } catch {
    return undefined;
  }
}

export function persistCourseDraftId(id: string) {
  try {
    sessionStorage.setItem(COURSE_BUILDER_DRAFT_ID_STORAGE_KEY, id.trim());
  } catch {
    /* ignore */
  }
}

export function clearPersistedCourseDraftId() {
  try {
    sessionStorage.removeItem(COURSE_BUILDER_DRAFT_ID_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadPersistedWizard(): PersistedWizard {
  try {
    const raw = sessionStorage.getItem(COURSE_BUILDER_FORM_STORAGE_KEY);
    if (!raw) return WIZARD_DEFAULT;
    const p = JSON.parse(raw) as Partial<PersistedWizard>;
    const str = (x: unknown) => (typeof x === "string" ? x : "");
    const step =
      typeof p.currentStep === "number" &&
      p.currentStep >= 1 &&
      p.currentStep <= 6
        ? p.currentStep
        : 1;
    return {
      currentStep: step,
      title: str(p.title),
      language: str(p.language),
      price: str(p.price),
      about: str(p.about),
      coreDepartment: str(p.coreDepartment),
      coreBranch: str(p.coreBranch),
      coreClass: str(p.coreClass),
    };
  } catch {
    return WIZARD_DEFAULT;
  }
}

export function persistWizard(w: PersistedWizard) {
  try {
    sessionStorage.setItem(COURSE_BUILDER_FORM_STORAGE_KEY, JSON.stringify(w));
  } catch {
    /* ignore */
  }
}

export function clearPersistedCourseBuilderForm() {
  try {
    sessionStorage.removeItem(COURSE_BUILDER_FORM_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function readCurriculumStore(): CurriculumStore {
  try {
    const raw = sessionStorage.getItem(COURSE_BUILDER_CURRICULUM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as CurriculumStore;
  } catch {
    return {};
  }
}

function writeCurriculumStore(store: CurriculumStore) {
  try {
    sessionStorage.setItem(COURSE_BUILDER_CURRICULUM_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function loadPersistedCurriculum(courseId: string): PersistedCurriculum | undefined {
  const key = courseId.trim();
  if (!key) return undefined;
  const store = readCurriculumStore();
  const entry = store[key];
  if (!entry || typeof entry !== "object") return undefined;
  return normalizePersistedCurriculum(entry);
}

export function persistCurriculum(courseId: string, curriculum: PersistedCurriculum) {
  const key = courseId.trim();
  if (!key) return;
  const store = readCurriculumStore();
  store[key] = normalizePersistedCurriculum(curriculum);
  writeCurriculumStore(store);
}

export function clearPersistedCurriculum(courseId?: string) {
  try {
    if (!courseId?.trim()) {
      sessionStorage.removeItem(COURSE_BUILDER_CURRICULUM_STORAGE_KEY);
      return;
    }
    const store = readCurriculumStore();
    delete store[courseId.trim()];
    writeCurriculumStore(store);
  } catch {
    /* ignore */
  }
}

export function clearAllCourseBuilderPersistence() {
  clearPersistedCourseDraftId();
  clearPersistedCourseBuilderForm();
  try {
    sessionStorage.removeItem(COURSE_BUILDER_CURRICULUM_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function normalizePersistedCurriculum(raw: Partial<PersistedCurriculum>): PersistedCurriculum {
  const chapters = Array.isArray(raw.chapters)
    ? raw.chapters
        .filter((c): c is PersistedChapter => c && typeof c === "object")
        .map((c) => ({
          id: typeof c.id === "string" && c.id ? c.id : crypto.randomUUID(),
          name: typeof c.name === "string" ? c.name : "",
          lectureSaved: Boolean(c.lectureSaved),
          lectureRemoteId:
            typeof c.lectureRemoteId === "string" && c.lectureRemoteId.trim()
              ? c.lectureRemoteId.trim()
              : undefined,
          videoPreviewUrl:
            typeof c.videoPreviewUrl === "string" && c.videoPreviewUrl.trim()
              ? c.videoPreviewUrl.trim()
              : undefined,
          assessmentSaved: Boolean(c.assessmentSaved),
          assessmentRemoteId:
            typeof c.assessmentRemoteId === "string" && c.assessmentRemoteId.trim()
              ? c.assessmentRemoteId.trim()
              : undefined,
          assessmentDurationMinutes:
            typeof c.assessmentDurationMinutes === "number" &&
            Number.isFinite(c.assessmentDurationMinutes)
              ? c.assessmentDurationMinutes
              : undefined,
        }))
    : [];

  const studyMaterials = Array.isArray(raw.studyMaterials)
    ? raw.studyMaterials
        .filter((m): m is PersistedStudyMaterial => m && typeof m === "object")
        .map((m) => ({
          id: typeof m.id === "string" && m.id ? m.id : crypto.randomUUID(),
          name: typeof m.name === "string" ? m.name : "Study material",
          saved: Boolean(m.saved),
          remoteId:
            typeof m.remoteId === "string" && m.remoteId.trim()
              ? m.remoteId.trim()
              : undefined,
          assetFileId:
            typeof m.assetFileId === "number" && Number.isFinite(m.assetFileId)
              ? m.assetFileId
              : undefined,
          viewUrl:
            typeof m.viewUrl === "string" && m.viewUrl.trim()
              ? m.viewUrl.trim()
              : undefined,
        }))
    : [];

  const g = raw.graduationExam;
  const graduationExam: PersistedGraduationExam = {
    saved: Boolean(g && typeof g === "object" && g.saved),
    assessmentRemoteId:
      g &&
      typeof g === "object" &&
      typeof g.assessmentRemoteId === "string" &&
      g.assessmentRemoteId.trim()
        ? g.assessmentRemoteId.trim()
        : undefined,
    durationMinutes:
      g &&
      typeof g === "object" &&
      typeof g.durationMinutes === "number" &&
      Number.isFinite(g.durationMinutes)
        ? g.durationMinutes
        : undefined,
  };

  return { chapters, studyMaterials, graduationExam };
}
