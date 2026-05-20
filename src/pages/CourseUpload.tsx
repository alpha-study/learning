import { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from "react";
import { useBlocker, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, skipToken } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Video, 
  Image as ImageIcon, 
  X, 
  Plus, 
  CheckCircle2, 
  Upload, 
  Trash2,
  FileText,
  AlertCircle,
  Info,
  Layers,
  Archive,
  GraduationCap,
  Eye,
  Play,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createCourseWithBasicInfoAndMedia,
  updateCourseWithBasicInfoAndMedia,
  fetchCourseById,
  fetchCourseByIdRaw,
  resolveCourseMediaSrc,
  createCourseLectureWithVideo,
  updateCourseLecture,
  extractVideoFileIdFromLectureResponse,
  deleteCourseLecture,
  deleteCourseAssessment,
  COURSE_ASSESSMENT_TYPE_MCQ,
  graduationAssessmentType,
  extractDeleteAssessmentMessage,
  getDeleteAssessmentErrorMessage,
  extractDeleteLectureMessage,
  extractCourseIdFromCreateResponse,
  extractCreateCourseMessage,
  extractCreateCourseData,
  extractCreateLectureMessage,
  extractLectureIdFromCreateResponse,
  getCourseCreateErrorMessage,
  getDeleteLectureErrorMessage,
  getCourseCreateOversizedMessage,
  getCourseMediaFileOversizedMessage,
  requestCourseReview,
  extractRequestCourseReviewMessage,
  parseCourseDetailFromApi,
  canRequestCourseReview,
  getCourseReviewBlockMessage,
  COURSE_STATUS,
} from "@/lib/api/course";
import {
  evaluateCourseReviewReadiness,
  fetchCourseAssessmentById,
  fetchCourseCurriculum,
  type CourseAssessmentListItem,
  type CourseLectureListItem,
} from "@/lib/api/course-curriculum";
import {
  clearAllCourseBuilderPersistence,
  clearPersistedCourseDraftId,
  loadPersistedCurriculum,
  loadPersistedWizard,
  persistCourseDraftId,
  persistCurriculum,
  persistWizard,
  readStoredCourseDraftId,
  type PersistedChapter,
  type PersistedCurriculum,
  WIZARD_DEFAULT,
} from "@/lib/course-builder-storage";
import {
  buildAddExamUrl,
  consumeExamSavedResult,
  setExamBuilderContext,
  subscribeExamSavedResult,
  type ExamBuilderKind,
} from "@/lib/exam-builder-context";
import {
  createCourseStudyMaterialWithFile,
  deleteCourseStudyMaterial,
  extractCreateStudyMaterialData,
  extractCreateStudyMaterialMessage,
  extractStudyMaterialIdFromCreateResponse,
  extractDeleteStudyMaterialMessage,
  getStudyMaterialErrorMessage,
} from "@/lib/api/study-material";
import { fetchFaculties, parseFacultiesDepartmentOptions } from "@/lib/api/faculties";
import {
  fetchStreamsByFacultyIds,
  parseStreamsBranchOptions,
} from "@/lib/api/streams";
import { fetchClasses, parseClassesOptions } from "@/lib/api/classes";
import { clearAssessmentSnapshot } from "@/lib/assessment-snapshot-storage";
import {
  COURSE_INSTRUCTION_LANGUAGE_OPTIONS,
  getCourseInstructionLanguageFieldError,
  getCourseLanguageApiFieldError,
  isCourseLanguageApiValidationError,
} from "@/lib/course-languages";
import { CourseAssessmentPreviewDialog } from "@/components/CourseAssessmentPreviewDialog";
import { CourseUploadReviewStep } from "@/components/CourseUploadReviewStep";
import { ApiError } from "@/lib/api/client";
import { cn, formatFileSize } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CourseSaveProgressBar } from "@/components/CourseSaveProgressBar";
import { CourseVideoPlayer } from "@/components/CourseVideoPlayer";
import {
  StudyMaterialPdfDialog,
  type StudyMaterialPdfSource,
} from "@/components/StudyMaterialPdfDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Chapter {
  id: string;
  name: string;
  video: File | null;
  videoPreview: string | null;
  lectureSaved: boolean;
  assessmentSaved: boolean;
  /** Set after successful POST /api/course/lecture/create when the API returns an id. */
  lectureRemoteId?: string;
  /** Server video file id from create/update or GET lectures — used when saving title only. */
  videoFileId?: number;
  /** Set after successful POST /api/course/assessment/create when the API returns an id. */
  assessmentRemoteId?: string;
  assessmentDurationMinutes?: number;
}

interface StudyMaterial {
  /** Local row id for React keys. */
  id: string;
  name: string;
  /** Present for new uploads; server-hydrated rows use `viewUrl` instead. */
  file?: File;
  /** Server URL for hydrated / saved materials without a local File. */
  viewUrl?: string;
  saved: boolean;
  uploading?: boolean;
  /** Server id from POST /api/course/study_material/create `data.id`. */
  remoteId?: string;
  assetFileId?: number;
}

const ASSESSMENT_DURATION_OPTIONS = [
  { label: "10 min", minutes: 10 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hr", minutes: 60 },
  { label: "1.30 hr", minutes: 90 },
  { label: "2 hr", minutes: 120 },
  { label: "3 hr", minutes: 180 },
] as const;

function normalizeAssessmentDurationMinutes(value: number): number {
  const match = ASSESSMENT_DURATION_OPTIONS.find((o) => o.minutes === value);
  return match?.minutes ?? 0;
}

function assessmentDurationSelectOptions(currentMinutes: number) {
  if (
    currentMinutes > 0 &&
    !ASSESSMENT_DURATION_OPTIONS.some((o) => o.minutes === currentMinutes)
  ) {
    return [
      ...ASSESSMENT_DURATION_OPTIONS,
      { label: `${currentMinutes} min`, minutes: currentMinutes },
    ];
  }
  return ASSESSMENT_DURATION_OPTIONS;
}

const STEPS = [
  { id: 1, label: "Basic Info", icon: Info },
  { id: 2, label: "Media Assets", icon: Video },
  { id: 3, label: "Curriculum", icon: Layers },
  { id: 4, label: "Graduation Exam", icon: GraduationCap },
  { id: 5, label: "Study Materials", icon: Archive },
  { id: 6, label: "Review", icon: CheckCircle2 },
];

const CORE_DEPARTMENTS = [
  { value: "Science", label: "Science" },
  { value: "Commerce", label: "Commerce" },
  { value: "Arts", label: "Arts" },
  { value: "Engineering", label: "Engineering" },
  { value: "Law", label: "Law" },
  { value: "Medicine", label: "Medicine" },
  { value: "Other", label: "Other" },
] as const;

const CORE_BRANCHES = [
  { value: "PCM", label: "PCM (Physics, Chemistry, Math)" },
  { value: "PCB", label: "PCB (Physics, Chemistry, Biology)" },
  { value: "Commerce core", label: "Commerce core" },
  { value: "Humanities", label: "Humanities" },
  { value: "Computer Science", label: "Computer Science" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "English", label: "English" },
  { value: "Multidisciplinary", label: "Multidisciplinary" },
  { value: "Other", label: "Other" },
] as const;

const CORE_CLASSES = [
  { value: "Class 6", label: "Class 6" },
  { value: "Class 7", label: "Class 7" },
  { value: "Class 8", label: "Class 8" },
  { value: "Class 9", label: "Class 9" },
  { value: "Class 10", label: "Class 10" },
  { value: "Class 11", label: "Class 11" },
  { value: "Class 12", label: "Class 12" },
  { value: "Undergraduate", label: "Undergraduate" },
  { value: "Other", label: "Other" },
] as const;

const LANGUAGE_OPTIONS = COURSE_INSTRUCTION_LANGUAGE_OPTIONS;

/**
 * “Core subject course” (department / branch / class). When `true`, shows the
 * Basic Info section, validation, GET /api/faculties|streams|classes usage, and create-course fields.
 */
const CORE_SUBJECT_COURSE_ENABLED = true;

function getCourseBuilderExitConfirmCopy(isEditingCourse: boolean) {
  if (isEditingCourse) {
    return {
      title: "Discard unsaved changes?",
      description:
        "You are about to leave course editing. Unsaved changes from this session will be lost.",
      confirmLabel: "Leave without saving",
    };
  }
  return {
    title: "Discard draft?",
    description:
      "You are about to exit the course builder. Any current progress will be lost.",
    confirmLabel: "Discard Changes",
  };
}

type BasicInfoFieldErrors = {
  title?: string;
  language?: string;
  price?: string;
  about?: string;
  coreSubject?: string;
};

function validateBasicInfoFields(params: {
  title: string;
  language: string;
  price: string;
  about: string;
  coreDepartment: string;
  coreBranch: string;
  coreClass: string;
}): BasicInfoFieldErrors {
  const errors: BasicInfoFieldErrors = {};
  const titleTrim = params.title.trim();
  if (!titleTrim) {
    errors.title = "Title is required.";
  } else if (titleTrim.length < 3 || titleTrim.length > 100) {
    errors.title = "Title must be between 3 and 100 characters.";
  }

  const languageError = getCourseInstructionLanguageFieldError(params.language);
  if (languageError) {
    errors.language = languageError;
  }

  const priceTrim = params.price.trim();
  if (!priceTrim) {
    errors.price = "Price is required.";
  } else {
    const n = Number.parseFloat(priceTrim);
    if (!Number.isFinite(n) || n < 0) {
      errors.price = "Enter a valid non-negative price.";
    }
  }

  const aboutTrim = params.about.trim();
  if (!aboutTrim) {
    errors.about = "Description is required.";
  } else if (aboutTrim.length < 10) {
    errors.about = "Description must be at least 10 characters.";
  }

  if (CORE_SUBJECT_COURSE_ENABLED) {
    const d = params.coreDepartment.trim();
    const b = params.coreBranch.trim();
    const c = params.coreClass.trim();
    const any = Boolean(d || b || c);
    const all = Boolean(d && b && c);
    if (any && !all) {
      errors.coreSubject =
        "If this is a Core Subject course, fill the fields below. Otherwise, skip.";
    }
  }

  return errors;
}

const ABOUT_TEXTAREA_MIN_HEIGHT_PX = 120;

function emptyChapter(): Chapter {
  return {
    id: crypto.randomUUID(),
    name: "",
    video: null,
    videoPreview: null,
    lectureSaved: false,
    assessmentSaved: false,
  };
}

function applyAssessmentToChapters(
  chapters: Chapter[],
  assessments: CourseAssessmentListItem[],
  gradType: number
): { chapters: Chapter[]; graduation: { saved: boolean; assessmentRemoteId?: string; durationMinutes?: number } } {
  const chapterAssessments = assessments.filter((a) => a.type !== gradType);
  const graduationRow = assessments.find((a) => a.type === gradType);
  const next = chapters.map((ch) => {
    if (!ch.lectureRemoteId) return ch;
    const lectureMatches = chapterAssessments.filter(
      (a) =>
        a.courseLectureId &&
        String(a.courseLectureId) === String(ch.lectureRemoteId)
    );
    if (lectureMatches.length === 0) return ch;
    let match = ch.assessmentRemoteId
      ? lectureMatches.find((a) => String(a.id) === String(ch.assessmentRemoteId))
      : undefined;
    if (!match) {
      match = [...lectureMatches].sort(
        (a, b) => Number(b.id) - Number(a.id) || 0
      )[0];
    }
    if (!match) return ch;
    return {
      ...ch,
      assessmentSaved: true,
      assessmentRemoteId: match.id,
      ...(match.durationMinutes != null
        ? { assessmentDurationMinutes: match.durationMinutes }
        : {}),
    };
  });
  return {
    chapters: next,
    graduation: graduationRow
      ? {
          saved: true,
          assessmentRemoteId: graduationRow.id,
          ...(graduationRow.durationMinutes != null
            ? { durationMinutes: graduationRow.durationMinutes }
            : {}),
        }
      : { saved: false },
  };
}

function lecturesToChapters(lectures: CourseLectureListItem[]): Chapter[] {
  if (lectures.length === 0) return [emptyChapter()];
  return lectures.map((l) => ({
    id: crypto.randomUUID(),
    name: l.chapterTitle,
    video: null,
    videoPreview: l.videoPreviewUrl ?? null,
    lectureSaved: true,
    lectureRemoteId: l.id,
    videoFileId: l.videoFileId,
    assessmentSaved: false,
  }));
}

function persistedChaptersToUi(chapters: PersistedChapter[]): Chapter[] {
  if (chapters.length === 0) return [emptyChapter()];
  return chapters.map((c) => ({
    id: c.id,
    name: c.name,
    video: null,
    videoPreview: c.videoPreviewUrl ?? null,
    lectureSaved: c.lectureSaved,
    lectureRemoteId: c.lectureRemoteId,
    videoFileId: c.videoFileId,
    assessmentSaved: c.assessmentSaved,
    assessmentRemoteId: c.assessmentRemoteId,
    assessmentDurationMinutes: c.assessmentDurationMinutes,
  }));
}

function buildPersistedCurriculum(
  chapters: Chapter[],
  studyMaterials: StudyMaterial[],
  graduationExam: { saved: boolean; assessmentRemoteId?: string; durationMinutes?: number }
): PersistedCurriculum {
  return {
    chapters: chapters.map((c) => ({
      id: c.id,
      name: c.name,
      lectureSaved: c.lectureSaved,
      lectureRemoteId: c.lectureRemoteId,
      videoFileId: c.videoFileId,
      videoPreviewUrl:
        c.videoPreview && !c.videoPreview.startsWith("blob:")
          ? c.videoPreview
          : undefined,
      assessmentSaved: c.assessmentSaved,
      assessmentRemoteId: c.assessmentRemoteId,
      assessmentDurationMinutes: c.assessmentDurationMinutes,
    })),
    studyMaterials: studyMaterials.map((m) => ({
      id: m.id,
      name: m.name,
      saved: m.saved,
      remoteId: m.remoteId,
      assetFileId: m.assetFileId,
      viewUrl: m.viewUrl,
    })),
    graduationExam: {
      saved: graduationExam.saved,
      assessmentRemoteId: graduationExam.assessmentRemoteId,
      durationMinutes: graduationExam.durationMinutes,
    },
  };
}

function applyCurriculumToState(
  curriculum: PersistedCurriculum,
  gradType: number,
  assessments: CourseAssessmentListItem[]
): {
  chapters: Chapter[];
  studyMaterials: StudyMaterial[];
  graduationExam: { saved: boolean; assessmentRemoteId?: string; durationMinutes?: number };
} {
  let chapters = persistedChaptersToUi(curriculum.chapters);
  if (assessments.length > 0) {
    const merged = applyAssessmentToChapters(chapters, assessments, gradType);
    chapters = merged.chapters;
    if (merged.graduation.saved) {
      return {
        chapters,
        studyMaterials: curriculum.studyMaterials.map((m) => ({
          id: m.id,
          name: m.name,
          saved: m.saved,
          remoteId: m.remoteId,
          assetFileId: m.assetFileId,
          viewUrl: m.viewUrl,
        })),
        graduationExam: merged.graduation,
      };
    }
  }
  return {
    chapters,
    studyMaterials: curriculum.studyMaterials.map((m) => ({
      id: m.id,
      name: m.name,
      saved: m.saved,
      remoteId: m.remoteId,
      assetFileId: m.assetFileId,
      viewUrl: m.viewUrl,
    })),
    graduationExam: curriculum.graduationExam,
  };
}
const ABOUT_TEXTAREA_MAX_HEIGHT_PX = 384;

export default function CourseUpload() {
  const navigate = useNavigate();
  const allowLeaveRef = useRef(false);
  const [searchParams] = useSearchParams();
  const editCourseIdParam = searchParams.get("courseId")?.trim() || undefined;
  const isEditingCourse = Boolean(editCourseIdParam);
  const exitConfirmCopy = getCourseBuilderExitConfirmCopy(isEditingCourse);
  const { toast } = useToast();

  const initialWizard = useMemo(() => loadPersistedWizard(), []);

  // Step Management
  const [currentStep, setCurrentStep] = useState(initialWizard.currentStep);
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const [mandatoryStepDialog, setMandatoryStepDialog] = useState<{
    title: string;
    messages: string[];
  } | null>(null);
  const [editDoneConfirmOpen, setEditDoneConfirmOpen] = useState(false);
  const [uploadConfirmOpen, setUploadConfirmOpen] = useState(false);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ type: 'video' | 'image', url: string } | null>(null);
  const [viewingPdf, setViewingPdf] = useState<StudyMaterialPdfSource | null>(null);
  const [assessmentPreviewOpen, setAssessmentPreviewOpen] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState<CourseAssessmentListItem | null>(
    null
  );
  const [activeAssessmentTitle, setActiveAssessmentTitle] = useState("Assessment preview");
  const [loadingAssessmentPreview, setLoadingAssessmentPreview] = useState(false);

  // Basic Info State (Step 1)
  const [title, setTitle] = useState(initialWizard.title);
  const [language, setLanguage] = useState(initialWizard.language);
  const [price, setPrice] = useState(initialWizard.price);
  const [about, setAbout] = useState(initialWizard.about);
  const [coreDepartment, setCoreDepartment] = useState(initialWizard.coreDepartment);
  const [coreBranch, setCoreBranch] = useState(initialWizard.coreBranch);
  const [coreClass, setCoreClass] = useState(initialWizard.coreClass);

  // Media State (Step 2)
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [introVideoPreview, setIntroVideoPreview] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [existingPromotionVideoFileId, setExistingPromotionVideoFileId] = useState<
    number | undefined
  >(undefined);
  const [existingCoverThumbnailFileId, setExistingCoverThumbnailFileId] = useState<
    number | undefined
  >(undefined);
  const [loadingCourseHydration, setLoadingCourseHydration] = useState(false);
  /** Server status from GET course (see COURSE_STATUS). */
  const [courseServerStatus, setCourseServerStatus] = useState<number | null>(null);

  // Chapters State (Step 3)
  const [chapters, setChapters] = useState<Chapter[]>([
    {
      id: crypto.randomUUID(),
      name: "",
      video: null,
      videoPreview: null,
      lectureSaved: false,
      assessmentSaved: false,
    },
  ]);

  // Graduation exam (Step 4) — separate from chapter assessments
  const [graduationExam, setGraduationExam] = useState<{
    saved: boolean;
    assessmentRemoteId?: string;
    durationMinutes?: number;
  }>({ saved: false });
  const [deletingGraduationExam, setDeletingGraduationExam] = useState(false);
  const [studyMaterialDeleteConfirm, setStudyMaterialDeleteConfirm] = useState<{
    localId: string;
    remoteId?: string;
    name: string;
  } | null>(null);
  const [deletingStudyMaterialId, setDeletingStudyMaterialId] = useState<string | null>(
    null,
  );
  const [uploadingStudyMaterial, setUploadingStudyMaterial] = useState(false);

  // Study Materials State (Step 5)
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);

  const [courseDraftSaving, setCourseDraftSaving] = useState(false);
  const [courseDraftId, setCourseDraftId] = useState<string | null>(null);
  const [savingLectureChapterId, setSavingLectureChapterId] = useState<string | null>(
    null
  );
  const [deletingLectureChapterId, setDeletingLectureChapterId] = useState<
    string | null
  >(null);
  const [chapterRemoveConfirm, setChapterRemoveConfirm] = useState<{
    chapterId: string;
  } | null>(null);
  const [lectureDeleteConfirm, setLectureDeleteConfirm] = useState<{
    chapterId: string;
    lectureRemoteId: string;
  } | null>(null);
  const [assessmentDeleteConfirm, setAssessmentDeleteConfirm] = useState<{
    target: "chapter" | "graduation";
    chapterId?: string;
    assessmentRemoteId?: string;
  } | null>(null);
  const [deletingAssessmentChapterId, setDeletingAssessmentChapterId] = useState<
    string | null
  >(null);
  const [assessmentConfirm, setAssessmentConfirm] = useState<{
    mode: "add" | "edit";
    kind: ExamBuilderKind;
    chapterLocalId?: string;
  } | null>(null);
  const [assessmentDurationMinutes, setAssessmentDurationMinutes] = useState(0);
  const [assessmentDurationError, setAssessmentDurationError] = useState<string | null>(
    null,
  );
  const [basicInfoFieldErrors, setBasicInfoFieldErrors] =
    useState<BasicInfoFieldErrors>({});

  useEffect(() => {
    if (currentStep !== 1) setBasicInfoFieldErrors({});
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 1) return;
    setBasicInfoFieldErrors((prev) =>
      Object.keys(prev).length > 0 ? {} : prev
    );
  }, [
    currentStep,
    title,
    language,
    price,
    about,
    coreDepartment,
    coreBranch,
    coreClass,
  ]);

  useEffect(() => {
    if (editCourseIdParam) {
      setCourseDraftId(editCourseIdParam);
      persistCourseDraftId(editCourseIdParam);
      return;
    }
    const stored = readStoredCourseDraftId();
    if (stored) {
      setCourseDraftId((prev) => prev ?? stored);
    }
  }, [editCourseIdParam]);

  useEffect(() => {
    const courseIdToLoad = editCourseIdParam ?? readStoredCourseDraftId();
    if (!courseIdToLoad) return;

    let cancelled = false;
    setLoadingCourseHydration(true);

    const applyBasicAndMedia = (data: Awaited<ReturnType<typeof fetchCourseById>>) => {
      setCourseDraftId(String(data.id));
      persistCourseDraftId(String(data.id));
      setCourseServerStatus(
        typeof data.status === "number" && Number.isFinite(data.status)
          ? data.status
          : COURSE_STATUS.DRAFT
      );
      setTitle(data.title);
      setLanguage(data.language);
      setPrice(String(data.sellingPrice ?? data.price ?? ""));
      setAbout(data.desc ?? "");
      setExistingPromotionVideoFileId(data.promotionVideoFileId);
      setExistingCoverThumbnailFileId(data.coverThumbnailFileId);
      const coverUrl = resolveCourseMediaSrc(data.coverThumbnail?.path);
      const promoUrl = resolveCourseMediaSrc(data.promotionVideo?.path);
      if (coverUrl) setThumbnailPreview(coverUrl);
      if (promoUrl) setIntroVideoPreview(promoUrl);
    };

    (async () => {
      try {
        const raw = await fetchCourseByIdRaw(courseIdToLoad);
        if (cancelled) return;
        const data = parseCourseDetailFromApi(raw);
        if (!data) {
          throw new Error("Could not parse course details from the server.");
        }
        applyBasicAndMedia(data);

        const gradType = graduationAssessmentType();
        const curriculum = await fetchCourseCurriculum(courseIdToLoad, raw);
        const persisted = loadPersistedCurriculum(courseIdToLoad);

        if (cancelled) return;

        if (curriculum.lectures.length > 0) {
          const merged = applyAssessmentToChapters(
            lecturesToChapters(curriculum.lectures),
            curriculum.assessments,
            gradType
          );
          setChapters(merged.chapters);
          if (merged.graduation.saved) {
            setGraduationExam(merged.graduation);
          }
        } else if (persisted) {
          const applied = applyCurriculumToState(
            persisted,
            gradType,
            curriculum.assessments
          );
          setChapters(applied.chapters);
          setGraduationExam(applied.graduationExam);
        }

        if (curriculum.studyMaterials.length > 0) {
          setStudyMaterials(
            curriculum.studyMaterials.map((m) => ({
              id: crypto.randomUUID(),
              name: m.title,
              saved: true,
              remoteId: m.id,
              assetFileId: m.assetFileId,
              viewUrl: m.viewUrl,
            }))
          );
        } else if (persisted && persisted.studyMaterials.length > 0) {
          setStudyMaterials(
            persisted.studyMaterials.map((m) => ({
              id: m.id,
              name: m.name,
              saved: m.saved,
              remoteId: m.remoteId,
              assetFileId: m.assetFileId,
              viewUrl: m.viewUrl,
            }))
          );
        }

        const gradFromApi = curriculum.assessments.find((a) => a.type === gradType);
        if (gradFromApi) {
          setGraduationExam({
            saved: true,
            assessmentRemoteId: gradFromApi.id,
            ...(gradFromApi.durationMinutes != null
              ? { durationMinutes: gradFromApi.durationMinutes }
              : {}),
          });
        } else if (
          persisted?.graduationExam.saved &&
          curriculum.lectures.length === 0
        ) {
          setGraduationExam(persisted.graduationExam);
        }
      } catch (e) {
        if (!cancelled) {
          const persisted = loadPersistedCurriculum(courseIdToLoad);
          if (persisted) {
            const applied = applyCurriculumToState(
              persisted,
              graduationAssessmentType(),
              []
            );
            setChapters(applied.chapters);
            setStudyMaterials(applied.studyMaterials);
            setGraduationExam(applied.graduationExam);
          }
          toast({
            title: "Could not fully load course",
            description: getCourseCreateErrorMessage(e),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoadingCourseHydration(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editCourseIdParam, toast]);

  useEffect(() => {
    const id = courseDraftId?.trim();
    if (!id) return;
    persistCurriculum(
      id,
      buildPersistedCurriculum(chapters, studyMaterials, graduationExam)
    );
  }, [courseDraftId, chapters, studyMaterials, graduationExam]);

  useEffect(() => {
    if (courseDraftId?.trim()) persistCourseDraftId(courseDraftId.trim());
  }, [courseDraftId]);

  useEffect(() => {
    persistWizard({
      currentStep,
      title,
      language,
      price,
      about,
      coreDepartment,
      coreBranch,
      coreClass,
    });
  }, [
    currentStep,
    title,
    language,
    price,
    about,
    coreDepartment,
    coreBranch,
    coreClass,
  ]);

  const facultiesQueryActive =
    CORE_SUBJECT_COURSE_ENABLED && (currentStep === 1 || currentStep === 6);
  const { data: facultiesData, isPending: facultiesDeptLoading } = useQuery({
    queryKey: ["faculties"],
    queryFn: facultiesQueryActive ? fetchFaculties : skipToken,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  const departmentSelectOptions = useMemo(() => {
    const parsed = parseFacultiesDepartmentOptions(facultiesData);
    const base: SearchableSelectOption[] =
      parsed.length > 0
        ? parsed.map((d) => ({ value: d.value, label: d.label }))
        : CORE_DEPARTMENTS.map((d) => ({ value: d.value, label: d.label }));
    return base;
  }, [facultiesData]);

  const facultyIdForStreams = coreDepartment.trim();

  const streamsQueryActive =
    CORE_SUBJECT_COURSE_ENABLED &&
    (currentStep === 1 || currentStep === 6) &&
    Boolean(facultyIdForStreams);
  const { data: streamsData, isPending: streamsBranchLoading } = useQuery({
    queryKey: ["streams", "byFaculty", facultyIdForStreams],
    queryFn: streamsQueryActive
      ? () => fetchStreamsByFacultyIds(facultyIdForStreams)
      : skipToken,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  const branchSelectOptions = useMemo(() => {
    if (!facultyIdForStreams) {
      return [];
    }
    const parsed = parseStreamsBranchOptions(streamsData);
    const base: SearchableSelectOption[] =
      parsed.length > 0
        ? parsed.map((b) => ({ value: b.value, label: b.label }))
        : CORE_BRANCHES.map((b) => ({ value: b.value, label: b.label }));
    return base;
  }, [streamsData, facultyIdForStreams]);

  useEffect(() => {
    if (!CORE_SUBJECT_COURSE_ENABLED) return;
    setCoreBranch("");
  }, [coreDepartment]);

  const classesQueryActive =
    CORE_SUBJECT_COURSE_ENABLED && (currentStep === 1 || currentStep === 6);
  const { data: classesData, isPending: classesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: classesQueryActive ? fetchClasses : skipToken,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  const classSelectOptions = useMemo(() => {
    const parsed = parseClassesOptions(classesData);
    const base: SearchableSelectOption[] =
      parsed.length > 0
        ? parsed.map((c) => ({ value: c.value, label: c.label }))
        : CORE_CLASSES.map((c) => ({ value: c.value, label: c.label }));
    return base;
  }, [classesData]);

  const coreDeptTrim = coreDepartment.trim();
  const coreBranchTrim = coreBranch.trim();
  const coreClassTrim = coreClass.trim();
  const coreSubjectAnySelected = Boolean(
    CORE_SUBJECT_COURSE_ENABLED &&
      (coreDeptTrim || coreBranchTrim || coreClassTrim)
  );
  const coreSubjectAllSelected = Boolean(
    CORE_SUBJECT_COURSE_ENABLED &&
      coreDeptTrim &&
      coreBranchTrim &&
      coreClassTrim
  );

  const curriculumAllLecturesSaved =
    chapters.length > 0 && chapters.every((ch) => ch.lectureSaved);
  const curriculumLectureSaveInFlight = savingLectureChapterId !== null;

  const leaveSaveInFlight =
    courseDraftSaving ||
    submittingForReview ||
    curriculumLectureSaveInFlight ||
    uploadingStudyMaterial;

  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeaveRef.current &&
      !leaveSaveInFlight &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (navigationBlocker.state === "blocked") {
      setBackConfirmOpen(true);
    }
  }, [navigationBlocker.state]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current || leaveSaveInFlight) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [leaveSaveInFlight]);

  const resolveCourseDraftId = useCallback((): string | undefined => {
    if (editCourseIdParam) return editCourseIdParam;
    const fromState = courseDraftId?.trim();
    if (fromState) return fromState;
    const stored = readStoredCourseDraftId();
    if (stored) {
      setCourseDraftId(stored);
      return stored;
    }
    return undefined;
  }, [courseDraftId, editCourseIdParam]);

  const openAssessmentPreview = useCallback(
    async (assessmentId: string | undefined, title: string) => {
      const id = assessmentId?.trim();
      const courseId = resolveCourseDraftId();
      if (!id) {
        toast({
          title: "Assessment not found",
          description: "Save the assessment first, then try viewing again.",
          variant: "destructive",
        });
        return;
      }
      if (!courseId) {
        toast({
          title: "Course not ready",
          description:
            "Complete Media (Save & Next) so the course exists on the server before viewing assessments.",
          variant: "destructive",
        });
        return;
      }

      setActiveAssessmentTitle(title);
      setActiveAssessment(null);
      setAssessmentPreviewOpen(true);
      setLoadingAssessmentPreview(true);

      try {
        const assessment = await fetchCourseAssessmentById(courseId, id);
        if (!assessment) {
          toast({
            title: "Assessment not found",
            description:
              "We could not load this assessment from the server. Try saving again or refresh the page.",
            variant: "destructive",
          });
          setAssessmentPreviewOpen(false);
          return;
        }
        setActiveAssessment(assessment);
      } catch (e) {
        toast({
          title: "Could not load assessment",
          description: getCourseCreateErrorMessage(e),
          variant: "destructive",
        });
        setAssessmentPreviewOpen(false);
      } finally {
        setLoadingAssessmentPreview(false);
      }
    },
    [resolveCourseDraftId, toast]
  );

  const openExamCreator = useCallback(
    (params: {
      kind: ExamBuilderKind;
      chapterLocalId?: string;
      durationMinutes?: number;
      replaceAssessmentRemoteId?: string;
    }) => {
      const draftId = resolveCourseDraftId();
      if (!draftId) {
        toast({
          title: "Course not ready",
          description:
            "Complete Media (Save & Next) so the course exists on the server before adding assessments.",
          variant: "destructive",
        });
        return;
      }

      let courseLectureId: string | undefined;
      if (params.kind === "chapter") {
        const ch = chapters.find((c) => c.id === params.chapterLocalId);
        if (!ch?.lectureRemoteId?.trim()) {
          toast({
            title: "Save lecture first",
            description:
              "Save this chapter’s video before adding an assessment.",
            variant: "destructive",
          });
          return;
        }
        courseLectureId = ch.lectureRemoteId.trim();
      } else {
        courseLectureId = chapters
          .find((c) => c.lectureRemoteId?.trim())
          ?.lectureRemoteId?.trim();
        if (!courseLectureId) {
          toast({
            title: "Save one lecture first",
            description:
              "Save at least one lecture video before opening the graduation exam.",
            variant: "destructive",
          });
          return;
        }
      }

      const replaceId = params.replaceAssessmentRemoteId?.trim();
      const examContext = {
        courseId: draftId,
        courseLectureId,
        kind: params.kind,
        chapterLocalId: params.chapterLocalId,
        assessmentType:
          params.kind === "graduation"
            ? graduationAssessmentType()
            : COURSE_ASSESSMENT_TYPE_MCQ,
        durationMinutes: normalizeAssessmentDurationMinutes(params.durationMinutes ?? 0),
        ...(replaceId ? { replaceAssessmentRemoteId: replaceId } : {}),
      };
      setExamBuilderContext(examContext);
      window.open(buildAddExamUrl(examContext), "_blank", "noopener,noreferrer");
    },
    [chapters, resolveCourseDraftId, toast],
  );

  const requestAddAssessment = useCallback(
    (params: { kind: ExamBuilderKind; chapterLocalId?: string }) => {
      const draftId = resolveCourseDraftId();
      if (!draftId) {
        toast({
          title: "Course not ready",
          description:
            "Complete Media (Save & Next) so the course exists on the server before adding assessments.",
          variant: "destructive",
        });
        return;
      }

      if (params.kind === "chapter") {
        const ch = chapters.find((c) => c.id === params.chapterLocalId);
        if (!ch?.lectureRemoteId?.trim()) {
          toast({
            title: "Save lecture first",
            description:
              "Save this chapter’s video before adding an assessment.",
            variant: "destructive",
          });
          return;
        }
      } else {
        const hasLecture = chapters.some((c) => c.lectureRemoteId?.trim());
        if (!hasLecture) {
          toast({
            title: "Save one lecture first",
            description:
              "Save at least one lecture video before opening the graduation exam.",
            variant: "destructive",
          });
          return;
        }
      }

      setAssessmentDurationMinutes(0);
      setAssessmentDurationError(null);
      setAssessmentConfirm({ mode: "add", ...params });
    },
    [chapters, resolveCourseDraftId, toast],
  );

  const requestEditAssessment = useCallback(
    (params: { kind: ExamBuilderKind; chapterLocalId?: string }) => {
      const draftId = resolveCourseDraftId();
      if (!draftId) {
        toast({
          title: "Course not ready",
          description:
            "Complete Media (Save & Next) so the course exists on the server before editing assessments.",
          variant: "destructive",
        });
        return;
      }

      if (params.kind === "chapter") {
        const ch = chapters.find((c) => c.id === params.chapterLocalId);
        if (!ch?.lectureRemoteId?.trim()) {
          toast({
            title: "Save lecture first",
            description:
              "Save this chapter’s video before editing the assessment.",
            variant: "destructive",
          });
          return;
        }
        const existing = ch.assessmentDurationMinutes ?? 0;
        const normalized = normalizeAssessmentDurationMinutes(existing);
        setAssessmentDurationMinutes(
          normalized > 0 ? normalized : existing > 0 ? existing : 0,
        );
      } else {
        const hasLecture = chapters.some((c) => c.lectureRemoteId?.trim());
        if (!hasLecture) {
          toast({
            title: "Save one lecture first",
            description:
              "Save at least one lecture video before opening the graduation exam.",
            variant: "destructive",
          });
          return;
        }
        const existing = graduationExam.durationMinutes ?? 0;
        const normalized = normalizeAssessmentDurationMinutes(existing);
        setAssessmentDurationMinutes(
          normalized > 0 ? normalized : existing > 0 ? existing : 0,
        );
      }

      setAssessmentDurationError(null);
      setAssessmentConfirm({ mode: "edit", ...params });
    },
    [chapters, graduationExam.durationMinutes, resolveCourseDraftId, toast],
  );

  const tryConfirmAssessment = (event: React.MouseEvent) => {
    event.preventDefault();
    if (!assessmentConfirm) return;
    const duration = normalizeAssessmentDurationMinutes(assessmentDurationMinutes);
    if (duration <= 0) {
      setAssessmentDurationError(
        "Choose how long students have to complete the assessment.",
      );
      return;
    }
    setAssessmentDurationError(null);
    const pending = assessmentConfirm;
    setAssessmentConfirm(null);
    setAssessmentDurationMinutes(0);

    let replaceAssessmentRemoteId: string | undefined;
    if (pending.mode === "edit") {
      if (pending.kind === "graduation") {
        replaceAssessmentRemoteId = graduationExam.assessmentRemoteId?.trim();
      } else if (pending.chapterLocalId) {
        replaceAssessmentRemoteId = chapters
          .find((c) => c.id === pending.chapterLocalId)
          ?.assessmentRemoteId?.trim();
      }
    }

    openExamCreator({
      kind: pending.kind,
      chapterLocalId: pending.chapterLocalId,
      durationMinutes: duration,
      ...(replaceAssessmentRemoteId
        ? { replaceAssessmentRemoteId }
        : {}),
    });
  };

  useEffect(() => {
    const applyExamSaved = () => {
      const result = consumeExamSavedResult();
      if (!result) return;
      if (result.kind === "graduation") {
        setGraduationExam({
          saved: true,
          ...(result.assessmentRemoteId
            ? { assessmentRemoteId: result.assessmentRemoteId }
            : {}),
          ...(result.durationMinutes
            ? { durationMinutes: result.durationMinutes }
            : {}),
        });
        toast({
          title: "Graduation exam saved",
          description: "It is now listed under Graduation Exam.",
        });
        requestAnimationFrame(() => {
          document
            .getElementById("graduation-exam-section")
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        return;
      }
      if (result.chapterLocalId) {
        setChapters((prev) =>
          prev.map((c) =>
            c.id === result.chapterLocalId
              ? {
                  ...c,
                  assessmentSaved: true,
                  ...(result.assessmentRemoteId
                    ? { assessmentRemoteId: result.assessmentRemoteId }
                    : {}),
                  ...(result.durationMinutes
                    ? { assessmentDurationMinutes: result.durationMinutes }
                    : {}),
                }
              : c
          )
        );
        toast({
          title: "Chapter assessment saved",
          description: "It is now listed under this chapter.",
        });
        requestAnimationFrame(() => {
          document
            .getElementById(`chapter-assessment-${result.chapterLocalId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    };
    applyExamSaved();
    return subscribeExamSavedResult(applyExamSaved);
  }, [toast]);

  const introVideoRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const aboutTextareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeAboutTextarea = useCallback(() => {
    const el = aboutTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(
      Math.max(el.scrollHeight, ABOUT_TEXTAREA_MIN_HEIGHT_PX),
      ABOUT_TEXTAREA_MAX_HEIGHT_PX
    );
    el.style.height = `${next}px`;
  }, []);

  useLayoutEffect(() => {
    resizeAboutTextarea();
  }, [about, currentStep, resizeAboutTextarea]);

  const handleMediaUpload = (file: File, type: 'video' | 'image', setFile: (f: File | null) => void, setPreview: (s: string | null) => void) => {
    const kind = type === "video" ? "promo" : "thumbnail";
    const oversized = getCourseMediaFileOversizedMessage(file, kind);
    if (oversized) {
      toast({
        title: "File too large",
        description: oversized,
        variant: "destructive",
      });
      return;
    }
    setFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const removeMedia = (setFile: (f: File | null) => void, setPreview: (s: string | null) => void, preview: string | null) => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const addChapter = () => {
    setChapters([
      ...chapters,
      {
        id: crypto.randomUUID(),
        name: "",
        video: null,
        videoPreview: null,
        lectureSaved: false,
        assessmentSaved: false,
      },
    ]);
  };

  const updateChapter = (id: string, field: string, value: unknown) => {
    setChapters(
      chapters.map((ch) => {
        if (ch.id !== id) return ch;
        if (field === "video") {
          if (value === null) {
            if (ch.videoPreview) URL.revokeObjectURL(ch.videoPreview);
            return {
              ...ch,
              video: null,
              videoPreview: null,
              lectureSaved: false,
              lectureRemoteId: undefined,
              videoFileId: undefined,
              assessmentSaved: false,
              assessmentRemoteId: undefined,
              assessmentDurationMinutes: undefined,
            };
          }
          const file = value as File;
          const oversized = getCourseMediaFileOversizedMessage(file, "lecture");
          if (oversized) {
            toast({
              title: "Video too large",
              description: oversized,
              variant: "destructive",
            });
            return ch;
          }
          const url = URL.createObjectURL(file);
          return {
            ...ch,
            video: file,
            videoPreview: url,
            lectureSaved: false,
            assessmentSaved: false,
            assessmentRemoteId: undefined,
            assessmentDurationMinutes: undefined,
          };
        }
        if (field === "name") {
          return {
            ...ch,
            name: value as string,
            lectureSaved: false,
          };
        }
        return { ...ch, [field]: value } as Chapter;
      })
    );
  };

  const saveChapterLecture = async (id: string) => {
    const ch = chapters.find((c) => c.id === id);
    if (!ch) return;

    const title = ch.name.trim();
    if (!title) {
      toast({
        title: "Cannot save yet",
        description: "Add a chapter title first.",
        variant: "destructive",
      });
      return;
    }

    const existingLectureId = ch.lectureRemoteId?.trim();
    const isUpdate = Boolean(existingLectureId);
    const hasNewVideo = Boolean(ch.video);

    if (!isUpdate && !hasNewVideo) {
      toast({
        title: "Cannot save yet",
        description: "Choose a lesson video first.",
        variant: "destructive",
      });
      return;
    }

    if (isUpdate && !hasNewVideo && !ch.videoPreview) {
      toast({
        title: "Cannot save yet",
        description: "This lesson has no video on file. Choose a video or remove and re-add the chapter.",
        variant: "destructive",
      });
      return;
    }

    let draftId = courseDraftId?.trim();
    if (!draftId) {
      const stored = readStoredCourseDraftId();
      if (stored) {
        draftId = stored;
        setCourseDraftId(stored);
      }
    }
    if (!draftId) {
      toast({
        title: "Course not ready",
        description:
          "Open Media and tap Save & Next again so a course id is stored (your intro video and thumbnail stay selected). If you already did that, the create-course response may be missing id or courseId — check the network response.",
        variant: "destructive",
      });
      return;
    }

    if (hasNewVideo) {
      const videoOversized = getCourseMediaFileOversizedMessage(ch.video!, "lecture");
      if (videoOversized) {
        toast({
          title: "Video too large",
          description: videoOversized,
          variant: "destructive",
        });
        return;
      }
    }

    setSavingLectureChapterId(id);
    try {
      const res = isUpdate
        ? await updateCourseLecture({
            lectureId: existingLectureId!,
            courseId: draftId,
            chapterTitle: title,
            ...(hasNewVideo ? { video: ch.video! } : { videoFileId: ch.videoFileId }),
          })
        : await createCourseLectureWithVideo({
            courseId: draftId,
            chapterTitle: title,
            video: ch.video!,
          });

      const remoteId = extractLectureIdFromCreateResponse(res) ?? existingLectureId;
      const videoFileId =
        extractVideoFileIdFromLectureResponse(res) ?? ch.videoFileId;

      if (!remoteId) {
        toast({
          title: "Lesson may not be linked",
          description:
            "We couldn’t confirm the lesson id from the server. Try saving again before adding a quiz.",
          variant: "destructive",
        });
      }

      setChapters((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                lectureSaved: true,
                video: hasNewVideo ? null : c.video,
                ...(remoteId ? { lectureRemoteId: remoteId } : {}),
                ...(videoFileId != null ? { videoFileId } : {}),
              }
            : c
        )
      );

      const serverMessage = extractCreateLectureMessage(res);
      toast({
        title: serverMessage ?? (isUpdate ? "Lesson updated" : "Lesson saved"),
        description: isUpdate
          ? "Chapter name and video changes are saved on the server."
          : remoteId
            ? "Your video is uploaded. You can add an optional quiz below or continue."
            : "Video sent — if anything looks wrong, check your connection and try Save again.",
      });
    } catch (e) {
      toast({
        title: "Could not save lesson",
        description: getCourseCreateErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setSavingLectureChapterId(null);
    }
  };

  const removeChapterFromUi = (id: string) => {
    if (chapters.length > 1) {
      setChapters((prev) => prev.filter((ch) => ch.id !== id));
      return;
    }
    setChapters([emptyChapter()]);
  };

  const clearChapterLectureState = (id: string) => {
    setChapters((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              video: null,
              videoPreview: null,
              lectureSaved: false,
              lectureRemoteId: undefined,
              videoFileId: undefined,
              assessmentSaved: false,
              assessmentRemoteId: undefined,
              assessmentDurationMinutes: undefined,
            }
          : c
      )
    );
  };

  const clearChapterAssessmentState = (id: string) => {
    setChapters((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              assessmentSaved: false,
              assessmentRemoteId: undefined,
              assessmentDurationMinutes: undefined,
            }
          : c
      )
    );
  };

  const requestRemoveChapter = (id: string) => {
    setChapterRemoveConfirm({ chapterId: id });
  };

  const confirmRemoveChapter = async () => {
    if (!chapterRemoveConfirm) return;
    const { chapterId } = chapterRemoveConfirm;
    const ch = chapters.find((c) => c.id === chapterId);
    setChapterRemoveConfirm(null);
    if (!ch) return;

    const remoteId = ch.lectureRemoteId?.trim();
    if (remoteId) {
      setDeletingLectureChapterId(chapterId);
      try {
        const res = await deleteCourseLecture(remoteId);
        removeChapterFromUi(chapterId);
        toast({
          title: extractDeleteLectureMessage(res) ?? "Lecture deleted",
          description: "This chapter was removed from your curriculum.",
        });
      } catch (e) {
        toast({
          title: "Could not delete lecture",
          description: getDeleteLectureErrorMessage(e),
          variant: "destructive",
        });
      } finally {
        setDeletingLectureChapterId(null);
      }
      return;
    }

    removeChapterFromUi(chapterId);
  };

  const requestDeleteSavedLecture = (id: string) => {
    const ch = chapters.find((c) => c.id === id);
    const remoteId = ch?.lectureRemoteId?.trim();
    if (!ch || !remoteId) return;
    setLectureDeleteConfirm({
      chapterId: id,
      lectureRemoteId: remoteId,
    });
  };

  const confirmDeleteSavedLecture = async () => {
    if (!lectureDeleteConfirm) return;
    const { chapterId, lectureRemoteId } = lectureDeleteConfirm;
    setLectureDeleteConfirm(null);
    setDeletingLectureChapterId(chapterId);
    try {
      const res = await deleteCourseLecture(lectureRemoteId);
      clearChapterLectureState(chapterId);
      toast({
        title: extractDeleteLectureMessage(res) ?? "Lecture deleted",
        description: "You can upload a new video and save again.",
      });
    } catch (e) {
      toast({
        title: "Could not delete lecture",
        description: getDeleteLectureErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setDeletingLectureChapterId(null);
    }
  };

  const requestDeleteAssessment = (chapterId: string) => {
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch?.assessmentSaved && !ch?.assessmentRemoteId?.trim()) return;
    setAssessmentDeleteConfirm({
      target: "chapter",
      chapterId,
      assessmentRemoteId: ch.assessmentRemoteId?.trim(),
    });
  };

  const requestDeleteGraduationExam = () => {
    if (!graduationExam.saved && !graduationExam.assessmentRemoteId?.trim()) return;
    setAssessmentDeleteConfirm({
      target: "graduation",
      assessmentRemoteId: graduationExam.assessmentRemoteId?.trim(),
    });
  };

  const confirmDeleteAssessment = async () => {
    if (!assessmentDeleteConfirm) return;
    const { target, chapterId, assessmentRemoteId } = assessmentDeleteConfirm;
    setAssessmentDeleteConfirm(null);

    if (target === "graduation") {
      if (!assessmentRemoteId) {
        setGraduationExam({ saved: false });
        toast({
          title: "Graduation exam removed",
          description: "You can add a new graduation exam.",
        });
        return;
      }

      setDeletingGraduationExam(true);
      try {
        const res = await deleteCourseAssessment(assessmentRemoteId);
        clearAssessmentSnapshot(assessmentRemoteId);
        setGraduationExam({ saved: false });
        toast({
          title: extractDeleteAssessmentMessage(res) ?? "Graduation exam deleted",
          description: "You can add a new graduation exam.",
        });
      } catch (e) {
        toast({
          title: "Could not delete graduation exam",
          description: getDeleteAssessmentErrorMessage(e),
          variant: "destructive",
        });
      } finally {
        setDeletingGraduationExam(false);
      }
      return;
    }

    if (!chapterId) return;

    if (!assessmentRemoteId) {
      clearChapterAssessmentState(chapterId);
      toast({
        title: "Assessment removed",
        description:
          "Removed from this chapter. Re-add the assessment if you need it saved on the server again.",
      });
      return;
    }

    setDeletingAssessmentChapterId(chapterId);
    try {
      const res = await deleteCourseAssessment(assessmentRemoteId);
      clearAssessmentSnapshot(assessmentRemoteId);
      clearChapterAssessmentState(chapterId);
      toast({
        title: extractDeleteAssessmentMessage(res) ?? "Assessment deleted",
        description: "You can add a new assessment for this chapter.",
      });
    } catch (e) {
      toast({
        title: "Could not delete assessment",
        description: getDeleteAssessmentErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setDeletingAssessmentChapterId(null);
    }
  };

  const viewStudyMaterial = (material: StudyMaterial) => {
    if (material.viewUrl?.trim()) {
      setViewingPdf({ url: material.viewUrl.trim(), title: material.name });
      return;
    }
    if (material.file) {
      setViewingPdf({ file: material.file, title: material.name });
      return;
    }
    toast({
      title: "Cannot open file",
      description: "This study material is not available to preview in this session.",
      variant: "destructive",
    });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (pdfRef.current) pdfRef.current.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file",
        description: "Only PDF files are allowed.",
        variant: "destructive",
      });
      return;
    }

    const draftId = resolveCourseDraftId();
    if (!draftId) {
      toast({
        title: "Course not ready",
        description:
          "Complete Media (Save & Next) so the course exists on the server before adding study materials.",
        variant: "destructive",
      });
      return;
    }

    const localId = crypto.randomUUID();
    setStudyMaterials((prev) => [
      ...prev,
      {
        id: localId,
        name: file.name,
        file,
        saved: false,
        uploading: true,
      },
    ]);
    setUploadingStudyMaterial(true);

    try {
      const res = await createCourseStudyMaterialWithFile(draftId, file);
      const remoteId = extractStudyMaterialIdFromCreateResponse(res);
      const data = extractCreateStudyMaterialData(res);
      setStudyMaterials((prev) =>
        prev.map((m) =>
          m.id === localId
            ? {
                ...m,
                saved: true,
                uploading: false,
                ...(remoteId ? { remoteId } : {}),
                ...(data?.assetFileId != null ? { assetFileId: data.assetFileId } : {}),
                name: data?.title?.trim() || m.name,
              }
            : m
        )
      );
      toast({
        title: "Study material added",
        description:
          extractCreateStudyMaterialMessage(res) ??
          "Your PDF was uploaded and linked to this course.",
      });
    } catch (err) {
      setStudyMaterials((prev) => prev.filter((m) => m.id !== localId));
      toast({
        title: "Could not add study material",
        description: getStudyMaterialErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setUploadingStudyMaterial(false);
    }
  };

  const requestRemoveStudyMaterial = (material: StudyMaterial) => {
    setStudyMaterialDeleteConfirm({
      localId: material.id,
      remoteId: material.remoteId,
      name: material.name,
    });
  };

  const confirmRemoveStudyMaterial = async () => {
    if (!studyMaterialDeleteConfirm) return;
    const { localId, remoteId, name } = studyMaterialDeleteConfirm;
    setStudyMaterialDeleteConfirm(null);

    if (!remoteId) {
      setStudyMaterials((prev) => prev.filter((m) => m.id !== localId));
      toast({
        title: "Study material removed",
        description: `"${name}" was removed from this list.`,
      });
      return;
    }

    setDeletingStudyMaterialId(localId);
    try {
      const res = await deleteCourseStudyMaterial(remoteId);
      setStudyMaterials((prev) => prev.filter((m) => m.id !== localId));
      toast({
        title: extractDeleteStudyMaterialMessage(res) ?? "Study material deleted",
        description: `"${name}" was removed from the server.`,
      });
    } catch (err) {
      toast({
        title: "Could not delete study material",
        description: getStudyMaterialErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setDeletingStudyMaterialId(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else setBackConfirmOpen(true);
  };

  const handleBackConfirmOpenChange = (open: boolean) => {
    setBackConfirmOpen(open);
    if (!open && navigationBlocker.state === "blocked") {
      navigationBlocker.reset();
    }
  };

  const confirmDiscardCourse = () => {
    allowLeaveRef.current = true;
    setBackConfirmOpen(false);
    clearAllCourseBuilderPersistence();
    if (navigationBlocker.state === "blocked") {
      navigationBlocker.proceed();
      return;
    }
    navigate("/my-courses");
  };

  const confirmEditDone = () => {
    allowLeaveRef.current = true;
    setEditDoneConfirmOpen(false);
    navigate("/my-courses");
  };

  const handleNext = useCallback(async () => {
    if (currentStep === 1) {
      const nextErrors = validateBasicInfoFields({
        title,
        language,
        price,
        about,
        coreDepartment,
        coreBranch,
        coreClass,
      });
      if (Object.keys(nextErrors).length > 0) {
        setBasicInfoFieldErrors(nextErrors);
        return;
      }
      setBasicInfoFieldErrors({});
    }
    // Media: POST /api/course/upload_assets (video + thumbnail), then POST JSON /api/course/create
    if (currentStep === 2) {
      if (courseDraftSaving) return;
      const hasIntroMedia = Boolean(introVideo) || existingPromotionVideoFileId != null;
      const hasThumbnailMedia = Boolean(thumbnail) || existingCoverThumbnailFileId != null;
      if (!hasIntroMedia || !hasThumbnailMedia) {
        toast({
          title: "Media Required",
          description:
            "Intro video and cover thumbnail are required. Upload new files or keep existing media when editing.",
          variant: "destructive",
        });
        return;
      }
      if (coreSubjectAnySelected && !coreSubjectAllSelected) {
        toast({
          title: "Core subject incomplete",
          description:
            "If you select department, branch, or class, you must select all three. Go back to Basic Info to finish.",
          variant: "destructive",
        });
        return;
      }
      if (introVideo) {
        const perFile = getCourseMediaFileOversizedMessage(introVideo, "promo");
        if (perFile) {
          toast({
            title: "Upload too large",
            description: perFile,
            variant: "destructive",
          });
          return;
        }
      }
      if (thumbnail) {
        const perFile = getCourseMediaFileOversizedMessage(thumbnail, "thumbnail");
        if (perFile) {
          toast({
            title: "Upload too large",
            description: perFile,
            variant: "destructive",
          });
          return;
        }
      }
      if (introVideo && thumbnail) {
        const oversized = getCourseCreateOversizedMessage(introVideo, thumbnail);
        if (oversized) {
          toast({
            title: "Upload too large",
            description: oversized,
            variant: "destructive",
          });
          return;
        }
      }
      const basicRecheck = validateBasicInfoFields({
        title,
        language,
        price,
        about,
        coreDepartment,
        coreBranch,
        coreClass,
      });
      if (Object.keys(basicRecheck).length > 0) {
        setBasicInfoFieldErrors(basicRecheck);
        setCurrentStep(1);
        toast({
          title: "Basic information needs attention",
          description:
            "Those rules are only checked on the Basic Information step. Fix the highlighted fields there, then open Media again and tap Save & Next.",
          variant: "destructive",
        });
        return;
      }
      const draftIdBeforeSave =
        courseDraftId?.trim() || readStoredCourseDraftId() || editCourseIdParam;
      const isUpdate = Boolean(draftIdBeforeSave);
      if (!isUpdate && (!introVideo || !thumbnail)) {
        toast({
          title: "Media Required",
          description: "Intro video and thumbnail are mandatory for a new course.",
          variant: "destructive",
        });
        return;
      }
      setCourseDraftSaving(true);
      try {
      const hasFacultyOptions =
        parseFacultiesDepartmentOptions(facultiesData).length > 0;
      const hasBranchOptions =
        parseStreamsBranchOptions(streamsData).length > 0;
      const hasClassOptions = parseClassesOptions(classesData).length > 0;
      const basicPayload = {
          title,
          language,
          price,
          about,
          department:
            CORE_SUBJECT_COURSE_ENABLED &&
            hasFacultyOptions &&
            coreDepartment.trim()
              ? coreDepartment.trim()
              : undefined,
          branch:
            CORE_SUBJECT_COURSE_ENABLED &&
            hasBranchOptions &&
            coreBranch.trim()
              ? coreBranch.trim()
              : undefined,
          studentClass:
            CORE_SUBJECT_COURSE_ENABLED &&
            hasClassOptions &&
            coreClass.trim()
              ? coreClass.trim()
              : undefined,
        };
      const res = isUpdate
        ? await updateCourseWithBasicInfoAndMedia(draftIdBeforeSave!, {
            ...basicPayload,
            introVideo: introVideo ?? undefined,
            thumbnail: thumbnail ?? undefined,
            promotionVideoFileId: existingPromotionVideoFileId,
            coverThumbnailFileId: existingCoverThumbnailFileId,
          })
        : await createCourseWithBasicInfoAndMedia({
            ...basicPayload,
            introVideo: introVideo!,
            thumbnail: thumbnail!,
          });
        const id = extractCourseIdFromCreateResponse(res) ?? draftIdBeforeSave;
        if (!id) {
          clearPersistedCourseDraftId();
          setCourseDraftId(null);
          toast({
            title: "Could not read course id",
            description:
              "The server accepted the request, but the response did not include a course id this app understands (e.g. id, courseId, or data.id). Fix the API mapping or share the JSON shape. Staying on Media so you can try again.",
            variant: "destructive",
          });
          return;
        }
        setCourseDraftId(id);
        const updatedData = extractCreateCourseData(res);
        if (updatedData?.promotionVideoFileId != null) {
          setExistingPromotionVideoFileId(updatedData.promotionVideoFileId);
        }
        if (updatedData?.coverThumbnailFileId != null) {
          setExistingCoverThumbnailFileId(updatedData.coverThumbnailFileId);
        }
        const serverMessage = extractCreateCourseMessage(res);
        toast({
          title: serverMessage ?? (isUpdate ? "Course updated" : "Course saved"),
          description: isUpdate
            ? "Your updates were saved. Continue building your course."
            : "Continue with curriculum and remaining steps.",
        });
        setCurrentStep(3);
      } catch (e) {
        const raw = getCourseCreateErrorMessage(e);
        const looksLikeMissingBasicFields =
          /title is required|description is required|language is required|title must be|description must be/i.test(
            raw
          );
        const looksLikeLanguageRejected = isCourseLanguageApiValidationError(raw);
        if (looksLikeMissingBasicFields || looksLikeLanguageRejected) {
          const fieldErrors = validateBasicInfoFields({
            title,
            language,
            price,
            about,
            coreDepartment,
            coreBranch,
            coreClass,
          });
          if (looksLikeLanguageRejected) {
            fieldErrors.language = getCourseLanguageApiFieldError(raw);
          }
          setBasicInfoFieldErrors(fieldErrors);
          setCurrentStep(1);
          toast({
            title: looksLikeLanguageRejected
              ? "Instruction language not accepted"
              : "Server rejected the course details",
            description: looksLikeLanguageRejected
              ? "The API only allows certain languages today. We sent you back to Basic Information — change Instruction Language, then return to Media and save again."
              : "Save & Next talks to the server from this page, so errors can show here even though the problem is your course title, description, or language. We sent you back to Basic Information — fix any highlighted fields, then return to Media and save again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Could not save course",
            description: raw,
            variant: "destructive",
          });
        }
      } finally {
        setCourseDraftSaving(false);
      }
      return;
    }
    // Curriculum Verification — every chapter lecture must be explicitly saved
    if (currentStep === 3) {
      const notAllLecturesSaved = chapters.some((ch) => !ch.lectureSaved);
      if (notAllLecturesSaved) {
        toast({
          title: "Save every lesson first",
          description:
            "Tap Save lesson on each chapter after you’ve added the title and video.",
          variant: "destructive",
        });
        return;
      }
    }
    // Exam Verification
    if (currentStep === 4 && !graduationExam.saved) {
      toast({
        title: "Graduation exam required",
        description:
          "Add the graduation exam, save it to the server, then continue.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < 6) setCurrentStep(currentStep + 1);
    else if (!canRequestCourseReview(courseServerStatus ?? undefined)) {
      allowLeaveRef.current = true;
      navigate("/my-courses");
    } else setUploadConfirmOpen(true);
  }, [
    currentStep,
    title,
    price,
    about,
    language,
    introVideo,
    thumbnail,
    chapters,
    graduationExam.saved,
    courseServerStatus,
    courseDraftId,
    courseDraftSaving,
    editCourseIdParam,
    existingPromotionVideoFileId,
    existingCoverThumbnailFileId,
    toast,
    coreDepartment,
    coreBranch,
    coreClass,
    coreSubjectAnySelected,
    coreSubjectAllSelected,
    facultiesData,
    streamsData,
    classesData,
    navigate,
  ]);

  const handleFooterPrimaryAction = () => {
    if (
      isEditingCourse &&
      currentStep === 6 &&
      courseServerStatus != null &&
      !canRequestCourseReview(courseServerStatus)
    ) {
      setEditDoneConfirmOpen(true);
      return;
    }
    void handleNext();
  };

  const handleUploadCourse = async () => {
    const draftId = resolveCourseDraftId();
    if (!draftId) {
      toast({
        title: "Course not ready",
        description:
          "Complete Media (Save & Next) so the course exists on the server before submitting for review.",
        variant: "destructive",
      });
      return;
    }

    if (loadingCourseHydration) {
      toast({
        title: "Still loading course",
        description: "Wait for the course to finish loading, then try again.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingForReview(true);
    try {
      const raw = await fetchCourseByIdRaw(draftId);
      const course = parseCourseDetailFromApi(raw);
      if (!course) {
        toast({
          title: "Could not submit course",
          description: "Could not read course details from the server. Try refreshing the page.",
          variant: "destructive",
        });
        return;
      }

      setCourseServerStatus(course.status);

      const reviewBlock = getCourseReviewBlockMessage(course.status);
      if (reviewBlock) {
        toast({
          title:
            course.status === COURSE_STATUS.REVIEW
              ? "Already in review"
              : "Cannot submit course",
          description: reviewBlock,
          variant: "destructive",
        });
        return;
      }

      const curriculum = await fetchCourseCurriculum(draftId, raw);
      const readiness = evaluateCourseReviewReadiness({
        course,
        curriculum,
        localLectureCount: chapters.filter((ch) => ch.lectureSaved).length,
        localHasGraduationExam: graduationExam.saved,
      });
      if (!readiness.ok) {
        toast({
          title: "Course is not ready to submit",
          description: readiness.errors.join(" "),
          variant: "destructive",
        });
        return;
      }

      const res = await requestCourseReview(draftId);
      setUploadConfirmOpen(false);
      clearAllCourseBuilderPersistence();
      toast({
        title: "Submitted for review",
        description:
          extractRequestCourseReviewMessage(res) ??
          "Your course has been submitted and will appear as In Review.",
      });
      allowLeaveRef.current = true;
      navigate("/my-courses");
    } catch (e) {
      toast({
        title: "Could not submit course",
        description: getCourseCreateErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setSubmittingForReview(false);
    }
  };

  const validateCurrentStepForSidebarLeave = useCallback((): {
    ok: boolean;
    title: string;
    messages: string[];
    fieldErrors?: BasicInfoFieldErrors;
  } => {
    switch (currentStep) {
      case 1: {
        const fieldErrors = validateBasicInfoFields({
          title,
          language,
          price,
          about,
          coreDepartment,
          coreBranch,
          coreClass,
        });
        const messages = Object.values(fieldErrors).filter(
          (m): m is string => Boolean(m)
        );
        return {
          ok: messages.length === 0,
          title: "Complete required fields",
          messages,
          fieldErrors,
        };
      }
      case 2: {
        const messages: string[] = [];
        const hasIntroMedia =
          Boolean(introVideo) || existingPromotionVideoFileId != null;
        const hasThumbnailMedia =
          Boolean(thumbnail) || existingCoverThumbnailFileId != null;
        if (!hasIntroMedia) {
          messages.push("Introduction video is required.");
        }
        if (!hasThumbnailMedia) {
          messages.push("Cover thumbnail is required.");
        }
        if (coreSubjectAnySelected && !coreSubjectAllSelected) {
          messages.push(
            "If you select department, branch, or class, you must select all three."
          );
        }
        if (introVideo) {
          const promoOver = getCourseMediaFileOversizedMessage(introVideo, "promo");
          if (promoOver) messages.push(promoOver);
        }
        if (thumbnail) {
          const thumbOver = getCourseMediaFileOversizedMessage(
            thumbnail,
            "thumbnail"
          );
          if (thumbOver) messages.push(thumbOver);
        }
        if (introVideo && thumbnail) {
          const combinedOver = getCourseCreateOversizedMessage(introVideo, thumbnail);
          if (combinedOver) messages.push(combinedOver);
        }
        return {
          ok: messages.length === 0,
          title: "Media required",
          messages,
        };
      }
      case 3: {
        const notAllLecturesSaved = chapters.some((ch) => !ch.lectureSaved);
        if (!notAllLecturesSaved) {
          return { ok: true, title: "", messages: [] };
        }
        return {
          ok: false,
          title: "Save every lesson first",
          messages: [
            "Tap Save lesson on each chapter after you've added the title and video.",
          ],
        };
      }
      case 4: {
        if (graduationExam.saved) {
          return { ok: true, title: "", messages: [] };
        }
        return {
          ok: false,
          title: "Graduation exam required",
          messages: [
            "Add the graduation exam, save it to the server, then continue.",
          ],
        };
      }
      default:
        return { ok: true, title: "", messages: [] };
    }
  }, [
    currentStep,
    title,
    language,
    price,
    about,
    coreDepartment,
    coreBranch,
    coreClass,
    introVideo,
    thumbnail,
    existingPromotionVideoFileId,
    existingCoverThumbnailFileId,
    coreSubjectAnySelected,
    coreSubjectAllSelected,
    chapters,
    graduationExam.saved,
  ]);

  const attemptSidebarStepChange = useCallback(
    (targetStepId: number) => {
      if (targetStepId === currentStep) return;

      if (isEditingCourse) {
        const result = validateCurrentStepForSidebarLeave();
        if (!result.ok) {
          if (result.fieldErrors) {
            setBasicInfoFieldErrors(result.fieldErrors);
          }
          setMandatoryStepDialog({
            title: result.title,
            messages: result.messages,
          });
          return;
        }
        setCurrentStep(targetStepId);
        return;
      }

      if (targetStepId < currentStep) {
        setCurrentStep(targetStepId);
        return;
      }
      if (targetStepId === currentStep + 1) {
        void handleNext();
      }
    },
    [
      currentStep,
      isEditingCourse,
      validateCurrentStepForSidebarLeave,
      handleNext,
    ]
  );

  const renderSidebar = () => (
    <aside className="hidden lg:flex lg:flex-col w-80 shrink-0 sticky top-6 min-h-[calc(100vh-5rem)] border-r border-border pl-4 pr-6 animate-in slide-in-from-left-4 duration-500">
      <Button
        type="button"
        variant="ghost"
        className="mb-4 -ml-2 h-auto w-full justify-start gap-2 px-2 py-2 text-muted-foreground hover:text-foreground"
        onClick={() => setBackConfirmOpen(true)}
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-semibold text-sm">My Courses</span>
      </Button>
      <div className="flex-1 space-y-2 min-h-0">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.id;
          const isCompleted = currentStep > s.id;
          const canJumpToStep =
            isEditingCourse || s.id <= currentStep || s.id === currentStep + 1;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => attemptSidebarStepChange(s.id)}
              className={cn(
                "w-full flex items-center gap-2 pl-3 pr-2 py-3 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : isCompleted
                    ? "text-primary hover:bg-primary/5"
                    : isEditingCourse
                      ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 cursor-not-allowed"
              )}
              disabled={!canJumpToStep}
            >
              <div className={cn(
                "w-8 h-8 shrink-0 rounded-full flex items-center justify-center border-2 transition-colors",
                isActive ? "border-primary-foreground" : (isCompleted ? "border-primary bg-primary/10" : "border-muted-foreground/30")
              )}>
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className="font-semibold text-sm text-left">{s.label}</span>
              {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-full mr-1.5"></div>}
            </button>
          );
        })}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-28">
      {loadingCourseHydration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">Loading course…</p>
          </div>
        </div>
      )}
      <div className="w-full pt-6 sm:pt-8">
        <div className="px-6 lg:hidden flex items-center justify-between gap-3 pb-4 mb-2 border-b border-border">
          <Button
            type="button"
            variant="ghost"
            className="h-auto shrink-0 gap-2 px-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setBackConfirmOpen(true)}
          >
            <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-semibold text-sm">My Courses</span>
          </Button>
          <ThemeToggle />
        </div>

        <div className="lg:flex lg:items-start">
        {renderSidebar()}

        <main className="flex-1 min-w-0 px-6 lg:pl-12 lg:pr-8">
          <div
            className={cn(
              "mx-auto w-full animate-in fade-in duration-500",
              currentStep === 6 ? "max-w-6xl" : "max-w-3xl",
            )}
          >
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <Card className="border-2 shadow-none">
                  <CardContent className="pt-8 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-md font-bold">Course Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Physics – CBSE Class 12 Science"
                        className={cn(
                          "h-12 text-lg shadow-sm",
                          basicInfoFieldErrors.title &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                        aria-invalid={Boolean(basicInfoFieldErrors.title)}
                      />
                      {basicInfoFieldErrors.title ? (
                        <p className="text-sm text-destructive" role="alert">
                          {basicInfoFieldErrors.title}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
                      <div className="space-y-2">
                        <Label className="text-md font-bold">Instruction Language *</Label>
                        <SearchableSelect
                          options={LANGUAGE_OPTIONS}
                          value={language}
                          onValueChange={setLanguage}
                          allowDeselect
                          placeholder="Select language"
                          searchPlaceholder="Search language…"
                          triggerClassName={cn(
                            "h-12",
                            basicInfoFieldErrors.language &&
                              "border-destructive text-destructive ring-1 ring-destructive/40"
                          )}
                          minDropdownWidth={220}
                        />
                        {basicInfoFieldErrors.language ? (
                          <p className="text-sm text-destructive" role="alert">
                            {basicInfoFieldErrors.language}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-md font-bold">Course Price (INR) *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className={cn(
                              "h-12 pl-8 shadow-sm",
                              basicInfoFieldErrors.price &&
                                "border-destructive focus-visible:ring-destructive"
                            )}
                            placeholder="1999"
                            aria-invalid={Boolean(basicInfoFieldErrors.price)}
                          />
                        </div>
                        {basicInfoFieldErrors.price ? (
                          <p className="text-sm text-destructive" role="alert">
                            {basicInfoFieldErrors.price}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {CORE_SUBJECT_COURSE_ENABLED ? (
                    <div
                      className={cn(
                        "w-full space-y-3 rounded-lg border border-dashed border-border/80 bg-muted/15 p-4 sm:p-5",
                        basicInfoFieldErrors.coreSubject &&
                          "border-destructive/80 bg-destructive/5"
                      )}
                    >
                      <div>
                        <p className="text-sm font-bold font-heading">Core subject course</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          If this is a Core Subject course, fill the fields below. Otherwise, skip.
                        </p>
                      </div>
                      <div className="grid w-full grid-cols-3 gap-3 sm:gap-4">
                        <div className="min-w-0 space-y-2">
                          <Label htmlFor="core-dept" className="text-sm font-semibold text-foreground">
                            Select department
                          </Label>
                          <SearchableSelect
                            id="core-dept"
                            options={departmentSelectOptions}
                            value={coreDepartment}
                            onValueChange={setCoreDepartment}
                            allowDeselect
                            placeholder={
                              facultiesDeptLoading ? "Loading departments…" : "Select department"
                            }
                            searchPlaceholder="Search department…"
                            triggerClassName="h-11"
                            minDropdownWidth={260}
                            disabled={facultiesDeptLoading}
                          />
                        </div>
                        <div className="min-w-0 space-y-2">
                          <Label htmlFor="core-branch" className="text-sm font-semibold text-foreground">
                            Select branch
                          </Label>
                          <SearchableSelect
                            id="core-branch"
                            options={branchSelectOptions}
                            value={coreBranch}
                            onValueChange={setCoreBranch}
                            allowDeselect
                            placeholder={
                              !facultyIdForStreams
                                ? "Select department first"
                                : streamsBranchLoading
                                  ? "Loading branches…"
                                  : "Select branch"
                            }
                            searchPlaceholder="Search branch…"
                            triggerClassName="h-11"
                            minDropdownWidth={280}
                            disabled={!facultyIdForStreams || streamsBranchLoading}
                          />
                        </div>
                        <div className="min-w-0 space-y-2">
                          <Label htmlFor="core-class" className="text-sm font-semibold text-foreground">
                            Select class
                          </Label>
                          <SearchableSelect
                            id="core-class"
                            options={classSelectOptions}
                            value={coreClass}
                            onValueChange={setCoreClass}
                            allowDeselect
                            placeholder={classesLoading ? "Loading classes…" : "Select class"}
                            searchPlaceholder="Search class…"
                            triggerClassName="h-11"
                            minDropdownWidth={220}
                            disabled={classesLoading}
                          />
                        </div>
                      </div>
                      {basicInfoFieldErrors.coreSubject ? (
                        <p className="text-sm text-destructive" role="alert">
                          {basicInfoFieldErrors.coreSubject}
                        </p>
                      ) : null}
                    </div>
                    ) : null}
                    <div className="space-y-2">
                      <Label className="text-md font-bold">About this Course *</Label>
                      <Textarea
                        ref={aboutTextareaRef}
                        rows={2}
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        placeholder="Enter the course description for students"
                        className={cn(
                          "text-md min-h-0 resize-none shadow-sm overflow-x-hidden overflow-y-auto max-h-96",
                          basicInfoFieldErrors.about &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                        aria-invalid={Boolean(basicInfoFieldErrors.about)}
                      />
                      {basicInfoFieldErrors.about ? (
                        <p className="text-sm text-destructive" role="alert">
                          {basicInfoFieldErrors.about}
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Media Assets */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex flex-col gap-6">
                  <Card className="overflow-hidden border-2 border-dashed bg-muted/20 transition-colors hover:bg-muted/30">
                    <CardHeader className="border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
                      <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                        <Video className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                        Promotion Video *
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center px-5 py-8 sm:px-6 sm:py-10">
                      {introVideoPreview ? (
                        <div className="w-full max-w-xl space-y-3">
                          <div className="group relative aspect-video w-full overflow-hidden rounded-xl shadow-xl">
                            <video src={introVideoPreview} controls className="h-full w-full" />
                            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => removeMedia(setIntroVideo, setIntroVideoPreview, introVideoPreview)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {introVideo ? (
                            <p className="break-all px-1 text-center text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{introVideo.name}</span>
                              {" · "}
                              <span className="tabular-nums">{formatFileSize(introVideo.size)}</span>
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full max-w-lg cursor-pointer flex-col items-center gap-5 rounded-xl px-4 py-6 text-center outline-none ring-offset-background transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          onClick={() => introVideoRef.current?.click()}
                        >
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Upload className="h-8 w-8 text-primary" aria-hidden />
                          </div>
                          <div className="space-y-2">
                            <span className="block text-lg font-bold text-primary">Upload intro video</span>
                            <span className="block text-sm leading-relaxed text-muted-foreground text-balance">
                              MP4 or MOV.
                            </span>
                          </div>
                          <input type="file" hidden ref={introVideoRef} accept="video/*" onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'video', setIntroVideo, setIntroVideoPreview)} />
                        </button>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-2 border-dashed bg-muted/20 transition-colors hover:bg-muted/30">
                    <CardHeader className="border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
                      <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                        <ImageIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                        Cover Thumbnail *
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center px-5 py-8 sm:px-6 sm:py-10">
                      <input
                        type="file"
                        hidden
                        ref={thumbnailRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (thumbnailPreview?.startsWith("blob:")) {
                            URL.revokeObjectURL(thumbnailPreview);
                          }
                          handleMediaUpload(file, "image", setThumbnail, setThumbnailPreview);
                          e.target.value = "";
                        }}
                      />
                      {thumbnailPreview ? (
                        <div className="w-full max-w-xl space-y-3">
                          <div className="group relative aspect-video w-full overflow-hidden rounded-xl shadow-xl">
                            <img src={thumbnailPreview} className="h-full w-full object-cover" alt="Thumbnail preview" />
                            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button variant="secondary" size="sm" type="button" onClick={() => setViewingMedia({ type: 'image', url: thumbnailPreview })}>
                                View Full
                              </Button>
                              <Button variant="secondary" size="sm" type="button" onClick={() => thumbnailRef.current?.click()}>
                                Replace
                              </Button>
                            </div>
                          </div>
                          {thumbnail ? (
                            <p className="break-all px-1 text-center text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{thumbnail.name}</span>
                              {" · "}
                              <span className="tabular-nums">{formatFileSize(thumbnail.size)}</span>
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full max-w-lg cursor-pointer flex-col items-center gap-5 rounded-xl px-4 py-6 text-center outline-none ring-offset-background transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          onClick={() => thumbnailRef.current?.click()}
                        >
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <ImageIcon className="h-8 w-8 text-primary" aria-hidden />
                          </div>
                          <div className="space-y-2">
                            <span className="block text-lg font-bold text-primary">Upload cover thumbnail</span>
                            <span className="block text-sm leading-relaxed text-muted-foreground">
                              PNG, JPG or WebP — <span className="whitespace-nowrap">1280×720</span> recommended
                            </span>
                          </div>
                        </button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 3: Curriculum */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="space-y-8">
                  {chapters.map((ch, idx) => {
                    const hasChapterAssessment =
                      ch.assessmentSaved || Boolean(ch.assessmentRemoteId?.trim());
                    return (
                    <div key={ch.id} className="relative animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-xl border border-border bg-card shadow-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1.5 z-10 h-8 w-8 shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:right-2 sm:top-2"
                        disabled={deletingLectureChapterId === ch.id}
                        onClick={() => requestRemoveChapter(ch.id)}
                        title="Remove chapter"
                        aria-label="Remove chapter"
                      >
                        {deletingLectureChapterId === ch.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="space-y-2 border-b border-border px-4 pb-5 pt-5 pr-11 sm:px-6 sm:pr-12">
                        <Label
                          htmlFor={`chapter-name-${ch.id}`}
                          className="block text-base font-semibold text-foreground"
                        >
                          <span className="tabular-nums">Chapter {idx + 1}</span>{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`chapter-name-${ch.id}`}
                          className="h-11 min-w-0 w-full text-base font-medium shadow-sm"
                          placeholder="Enter chapter name"
                          value={ch.name}
                          onChange={(e) => updateChapter(ch.id, "name", e.target.value)}
                        />
                      </div>

                      <div className="px-4 py-6 sm:px-6">
                        <section aria-labelledby={`lecture-video-${ch.id}`}>
                          <h3
                            id={`lecture-video-${ch.id}`}
                            className="mb-4 text-base font-semibold text-foreground"
                          >
                            Lecture video <span className="text-destructive">*</span>
                          </h3>

                          <Card
                            className={cn(
                              "overflow-hidden border-2 transition-colors",
                              ch.videoPreview
                                ? "border-primary/20 bg-muted/10"
                                : "border-dashed border-muted-foreground/20 bg-muted/5 hover:border-primary/30 hover:bg-muted/10"
                            )}
                          >
                            <CardContent className="p-0">
                              {ch.videoPreview ? (
                                <div className="relative aspect-video w-full group">
                                  <video src={ch.videoPreview} className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Button variant="secondary" size="sm" type="button" onClick={() => setViewingMedia({ type: "video", url: ch.videoPreview! })}>
                                      <Play className="mr-2 h-4 w-4" /> Preview
                                    </Button>
                                    <Button variant="destructive" size="sm" type="button" onClick={() => updateChapter(ch.id, "video", null)}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Remove video
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="flex w-full flex-col items-center gap-4 px-4 py-10 text-center outline-none ring-offset-background transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.accept = "video/*";
                                    input.onchange = (e: Event) => {
                                      const t = e.target as HTMLInputElement;
                                      const f = t.files?.[0];
                                      if (f) updateChapter(ch.id, "video", f);
                                    };
                                    input.click();
                                  }}
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                    <Upload className="h-6 w-6 text-primary" aria-hidden />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="block text-base font-semibold text-primary">Tap to choose video</span>
                                    <span className="block text-sm text-muted-foreground">From your computer or device</span>
                                  </div>
                                </button>
                              )}
                              <div className="flex flex-col gap-3 border-t border-border/80 bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-h-[1.25rem] flex-1 text-sm">
                                  {ch.lectureSaved ? (
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                      <span className="inline-flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                                        Saved
                                      </span>
                                      {ch.lectureRemoteId ? (
                                        <Button
                                          type="button"
                                          variant="link"
                                          size="sm"
                                          className="h-auto shrink-0 px-0 text-destructive hover:text-destructive"
                                          disabled={deletingLectureChapterId === ch.id}
                                          onClick={() => requestDeleteSavedLecture(ch.id)}
                                        >
                                          {deletingLectureChapterId === ch.id ? (
                                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                                          )}
                                          Remove saved lesson
                                        </Button>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      When the title and video look good, tap <strong className="font-semibold text-foreground">Save lecture</strong>.
                                    </span>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  className="w-full shrink-0 font-semibold sm:w-auto sm:min-w-[140px]"
                                  disabled={savingLectureChapterId === ch.id}
                                  onClick={() => void saveChapterLecture(ch.id)}
                                >
                                  {savingLectureChapterId === ch.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Saving…
                                    </>
                                  ) : ch.lectureSaved ? (
                                    "Save again"
                                  ) : (
                                    "Save lecture"
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </section>

                        <section
                          id={`chapter-assessment-${ch.id}`}
                          aria-labelledby={`chapter-quiz-${ch.id}`}
                          className="mt-10 space-y-4 border-t border-border pt-10"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <h3
                              id={`chapter-quiz-${ch.id}`}
                              className="text-base font-semibold text-foreground"
                            >
                              Chapter {idx + 1}: Assessment{" "}
                              <span className="font-normal text-muted-foreground">(Optional)</span>
                            </h3>
                            {!hasChapterAssessment ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full shrink-0 gap-2 sm:w-auto sm:min-w-[11rem]"
                                disabled={!ch.lectureSaved}
                                title={
                                  !ch.lectureSaved
                                    ? "Save this lesson’s video first"
                                    : undefined
                                }
                                onClick={() =>
                                  requestAddAssessment({
                                    kind: "chapter",
                                    chapterLocalId: ch.id,
                                  })
                                }
                              >
                                <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                                Add assessment
                              </Button>
                            ) : null}
                          </div>

                          {hasChapterAssessment ? (
                            <Card className="overflow-hidden border-2 border-green-500/25 bg-green-50/50 dark:bg-green-950/20">
                              <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
                                <div className="flex min-w-0 items-start gap-4">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600/15 dark:bg-green-500/20">
                                    <CheckCircle2
                                      className="h-6 w-6 text-green-700 dark:text-green-400"
                                      aria-hidden
                                    />
                                  </div>
                                  <div className="min-w-0 space-y-1">
                                    <p className="text-base font-semibold text-foreground">
                                      Assessment added to this chapter
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {ch.name.trim()
                                        ? `Linked to “${ch.name.trim()}”.`
                                        : "Linked to this lesson."}
                                      {ch.assessmentDurationMinutes
                                        ? ` Students have ${ch.assessmentDurationMinutes} min to complete it.`
                                        : null}
                                    </p>
                                    {ch.assessmentRemoteId ? (
                                      <p className="text-xs text-muted-foreground tabular-nums">
                                        ID: {ch.assessmentRemoteId}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex w-full flex-nowrap items-stretch gap-2 border-t border-green-500/25 pt-4">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="min-w-0 flex-1 gap-1.5"
                                    disabled={
                                      deletingAssessmentChapterId === ch.id ||
                                      loadingAssessmentPreview
                                    }
                                    onClick={() =>
                                      void openAssessmentPreview(
                                        ch.assessmentRemoteId,
                                        `Chapter quiz · ${ch.name.trim() || `Chapter ${idx + 1}`}`
                                      )
                                    }
                                  >
                                    <Eye className="h-4 w-4 shrink-0" aria-hidden />
                                    View assessment
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="min-w-0 flex-1 gap-1.5"
                                    disabled={deletingAssessmentChapterId === ch.id}
                                    onClick={() =>
                                      requestEditAssessment({
                                        kind: "chapter",
                                        chapterLocalId: ch.id,
                                      })
                                    }
                                  >
                                    <FileText className="h-4 w-4 shrink-0" aria-hidden />
                                    Edit assessment
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="min-w-0 flex-1 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    disabled={deletingAssessmentChapterId === ch.id}
                                    onClick={() => requestDeleteAssessment(ch.id)}
                                  >
                                    {deletingAssessmentChapterId === ch.id ? (
                                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                                    ) : (
                                      <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                                    )}
                                    Remove assessment
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ) : null}
                        </section>
                      </div>
                    </div>
                    );
                  })}
                </div>
                <Button variant="outline" className="w-full h-16 border-dashed border-2 rounded-xl text-lg font-bold group mt-8" onClick={addChapter}>
                  <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
                  Add another lesson
                </Button>
              </div>
            )}

            {/* Step 4: Graduation Exam */}
            {currentStep === 4 && (
              <div id="graduation-exam-section" className="space-y-6">
                <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
                   <div className="bg-primary/5 p-8 flex flex-col items-center gap-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-lg">
                      <GraduationCap className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-bold">Graduation Assessment</h3>
                       <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                         Final course exam — separate from chapter quizzes.
                       </p>
                    </div>
                   </div>
                  <CardContent className="space-y-6 border-t px-6 py-8 sm:px-8">
                    {!graduationExam.saved ? (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <p className="max-w-md text-sm text-muted-foreground">
                          Choose exam duration, then build and save the graduation exam to the
                          server.
                        </p>
                        <Button
                          type="button"
                          className="h-14 min-w-[14rem] px-8 text-lg font-bold gradient-gold shadow-lg"
                          onClick={() => requestAddAssessment({ kind: "graduation" })}
                        >
                          <Plus className="mr-2 h-5 w-5" aria-hidden />
                          Add graduation exam
                        </Button>
                      </div>
                    ) : (
                      <Card className="overflow-hidden border-2 border-green-500/25 bg-green-50/50 dark:bg-green-950/20">
                        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600/15 dark:bg-green-500/20">
                              <CheckCircle2
                                className="h-6 w-6 text-green-700 dark:text-green-400"
                                aria-hidden
                              />
                            </div>
                            <div className="min-w-0 space-y-1 text-left">
                              <p className="text-base font-semibold text-foreground">
                                Graduation exam added
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Saved for this course only (not under chapters).
                                {graduationExam.durationMinutes
                                  ? ` ${graduationExam.durationMinutes} min allowed.`
                                  : null}
                              </p>
                              {graduationExam.assessmentRemoteId ? (
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  ID: {graduationExam.assessmentRemoteId}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex w-full flex-nowrap items-stretch gap-2 border-t border-green-500/25 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-w-0 flex-1 gap-1.5"
                              disabled={deletingGraduationExam || loadingAssessmentPreview}
                              onClick={() =>
                                void openAssessmentPreview(
                                  graduationExam.assessmentRemoteId,
                                  "Graduation exam"
                                )
                              }
                            >
                              <Eye className="h-4 w-4 shrink-0" aria-hidden />
                              View exam
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-w-0 flex-1 gap-1.5"
                              disabled={deletingGraduationExam}
                              onClick={() =>
                                requestEditAssessment({ kind: "graduation" })
                              }
                            >
                              <FileText className="h-4 w-4 shrink-0" aria-hidden />
                              Edit exam
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-w-0 flex-1 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={deletingGraduationExam}
                              onClick={requestDeleteGraduationExam}
                            >
                              {deletingGraduationExam ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                              )}
                              Remove exam
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Study Materials */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div
                  className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 text-sm"
                  role="note"
                >
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <p className="leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">This step is optional.</span>{" "}
                    Study materials are extra PDFs for your students (notes, worksheets, etc.). If
                    you do not have any, you can skip this step and go straight to Review.
                  </p>
                </div>
                <Card
                  className={cn(
                    "flex flex-col items-center justify-center gap-6 border-2 border-dashed py-16 transition-all",
                    uploadingStudyMaterial
                      ? "pointer-events-none opacity-70"
                      : "cursor-pointer hover:border-primary hover:bg-primary/5",
                  )}
                  onClick={() => {
                    if (!uploadingStudyMaterial) pdfRef.current?.click();
                  }}
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 shadow-lg">
                    {uploadingStudyMaterial ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                    ) : (
                      <FileText className="h-10 w-10 text-primary" aria-hidden />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">
                      {uploadingStudyMaterial ? "Uploading PDF…" : "Click to upload PDFs"}
                    </p>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                      Files upload to the server and link to this course as study materials.
                    </p>
                  </div>
                  <input
                    type="file"
                    hidden
                    ref={pdfRef}
                    accept="application/pdf"
                    disabled={uploadingStudyMaterial}
                    onChange={(e) => void handlePdfUpload(e)}
                  />
                </Card>

                {studyMaterials.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <h3 className="flex items-center gap-2 text-lg font-bold">
                      <Archive className="h-5 w-5 text-primary" aria-hidden />
                      Study materials ({studyMaterials.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {studyMaterials.map((m) => (
                        <div
                          key={m.id}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:border-primary/50"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-4">
                            <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                              {m.uploading ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                              ) : (
                                <FileText className="h-5 w-5 text-primary" aria-hidden />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{m.name}</p>
                              {m.uploading ? (
                                <p className="text-xs text-muted-foreground">Saving to server…</p>
                              ) : m.saved ? (
                                <p className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  Saved on server
                                  {m.remoteId ? (
                                    <span className="tabular-nums text-muted-foreground">
                                      · ID {m.remoteId}
                                    </span>
                                  ) : null}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                m.uploading ||
                                deletingStudyMaterialId === m.id ||
                                (!m.file && !m.viewUrl?.trim())
                              }
                              onClick={() => viewStudyMaterial(m)}
                            >
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={m.uploading || deletingStudyMaterialId === m.id}
                              onClick={() => requestRemoveStudyMaterial(m)}
                            >
                              {deletingStudyMaterialId === m.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                "Remove"
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <CourseUploadReviewStep
                title={title}
                language={language}
                price={price}
                about={about}
                coreDepartment={coreDepartment}
                coreBranch={coreBranch}
                coreClass={coreClass}
                coreSubjectEnabled={CORE_SUBJECT_COURSE_ENABLED}
                languageOptions={LANGUAGE_OPTIONS}
                departmentOptions={departmentSelectOptions}
                branchOptions={branchSelectOptions}
                classOptions={classSelectOptions}
                introVideoPreview={introVideoPreview}
                introVideo={introVideo}
                existingPromotionVideoFileId={existingPromotionVideoFileId}
                thumbnailPreview={thumbnailPreview}
                thumbnail={thumbnail}
                existingCoverThumbnailFileId={existingCoverThumbnailFileId}
                chapters={chapters}
                graduationExam={graduationExam}
                studyMaterials={studyMaterials}
                courseDraftId={courseDraftId}
                reviewBlockMessage={
                  courseServerStatus != null &&
                  !canRequestCourseReview(courseServerStatus)
                    ? `${getCourseReviewBlockMessage(courseServerStatus) ?? "This course cannot be submitted for review."}${
                        courseServerStatus === COURSE_STATUS.REVIEW
                          ? " Use Back Step to keep editing sections."
                          : ""
                      }`
                    : undefined
                }
                onPreviewIntro={() => {
                  if (introVideoPreview) {
                    setViewingMedia({ type: "video", url: introVideoPreview });
                  }
                }}
                onPreviewThumbnail={() => {
                  if (thumbnailPreview) {
                    setViewingMedia({ type: "image", url: thumbnailPreview });
                  }
                }}
                onPreviewLecture={(url) => setViewingMedia({ type: "video", url })}
                onViewGraduationExam={() =>
                  void openAssessmentPreview(
                    graduationExam.assessmentRemoteId,
                    "Graduation exam"
                  )
                }
                onViewChapterAssessment={(assessmentRemoteId, chapterLabel) =>
                  void openAssessmentPreview(
                    assessmentRemoteId,
                    `Chapter quiz · ${chapterLabel}`
                  )
                }
                onViewStudyMaterial={viewStudyMaterial}
              />
            )}
          </div>
        </main>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-md">
        <CourseSaveProgressBar />
        <div className="flex w-full flex-col gap-2.5 py-2.5 lg:flex-row lg:items-center lg:gap-0">
          {/* Same width as sidebar — Step centered under it */}
          <div className="flex w-full justify-center px-6 lg:w-80 lg:shrink-0 lg:justify-center lg:px-0">
            <div
              className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-bold whitespace-nowrap text-muted-foreground sm:px-3 sm:py-1.5 sm:text-xs"
              aria-live="polite"
            >
              Step {currentStep} / 6
            </div>
          </div>

          {/* Mirrors main: pl-12 pr-8 + max-w-3xl — buttons flush right with form column */}
          <div className="flex min-w-0 flex-1 flex-col px-6 lg:px-0 lg:pl-12 lg:pr-8">
            <div
              className={cn(
                "mx-auto flex w-full flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3 sm:min-w-0",
                currentStep === 6 ? "max-w-6xl" : "max-w-3xl"
              )}
            >
              <Button variant="outline" className="order-2 h-10 w-full font-semibold text-sm sm:order-1 sm:h-11 sm:w-[150px]" onClick={handleBack}>
                {currentStep === 1 ? "Cancel" : "Back Step"}
              </Button>
              <Button
                className="gradient-gold order-1 h-10 w-full text-sm font-bold shadow-lg sm:order-2 sm:h-11 sm:w-[250px] sm:text-base"
                onClick={handleFooterPrimaryAction}
                disabled={
                  courseDraftSaving ||
                  submittingForReview ||
                  loadingCourseHydration ||
                  (currentStep === 3 &&
                    (!curriculumAllLecturesSaved || curriculumLectureSaveInFlight))
                }
              >
                {courseDraftSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : currentStep === 6 ? (
                  loadingCourseHydration
                    ? "Loading…"
                    : courseServerStatus != null &&
                        !canRequestCourseReview(courseServerStatus)
                      ? "Done"
                      : "Submit & Publish"
                ) : currentStep === 2 ? (
                  "Save & Next"
                ) : (
                  "Continue to Next"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!viewingMedia} onOpenChange={(open) => !open && setViewingMedia(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden border-none bg-black p-0 shadow-2xl [&>button]:right-3 [&>button]:top-3 [&>button]:z-50 [&>button]:h-auto [&>button]:w-auto [&>button]:rounded-full [&>button]:border-0 [&>button]:bg-transparent [&>button]:p-2 [&>button]:text-white [&>button]:opacity-90 [&>button]:shadow-none [&>button]:ring-offset-black [&>button]:hover:bg-white/20 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40 [&>button>svg]:h-6 [&>button>svg]:w-6">
          <div className="flex min-h-[50vh] max-h-[90vh] items-center justify-center">
            {viewingMedia?.type === 'video' ? (
              <CourseVideoPlayer
                src={viewingMedia.url}
                autoPlay
                className="max-h-[85vh] max-w-full rounded-lg"
              />
            ) : (
              <img src={viewingMedia?.url} className="max-h-[85vh] max-w-full object-contain" alt="Preview" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <StudyMaterialPdfDialog
        open={viewingPdf != null}
        onOpenChange={(open) => !open && setViewingPdf(null)}
        source={viewingPdf}
      />

      <CourseAssessmentPreviewDialog
        open={assessmentPreviewOpen}
        onOpenChange={(open) => {
          setAssessmentPreviewOpen(open);
          if (!open) setActiveAssessment(null);
        }}
        assessment={activeAssessment}
        title={activeAssessmentTitle}
        loading={loadingAssessmentPreview}
      />

      <AlertDialog
        open={chapterRemoveConfirm != null}
        onOpenChange={(open) => {
          if (!open) setChapterRemoveConfirm(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Remove chapter?</AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              {(() => {
                const ch = chapterRemoveConfirm
                  ? chapters.find((c) => c.id === chapterRemoveConfirm.chapterId)
                  : undefined;
                const title = ch?.name?.trim();
                const hasSavedLecture = Boolean(ch?.lectureRemoteId?.trim());
                const chapterLabel = title ? `"${title}"` : "This chapter";
                if (hasSavedLecture) {
                  return `${chapterLabel} will be removed from your curriculum, and the saved lecture will be deleted from the server. This cannot be undone.`;
                }
                return `${chapterLabel} will be removed from your curriculum. Any unsaved video or assessment work for this chapter will be lost.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmRemoveChapter()}
            >
              Remove chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={assessmentConfirm != null}
        onOpenChange={(open) => {
          if (!open) {
            setAssessmentConfirm(null);
            setAssessmentDurationMinutes(0);
            setAssessmentDurationError(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">
              {(() => {
                const isGrad = assessmentConfirm?.kind === "graduation";
                const isEdit = assessmentConfirm?.mode === "edit";
                if (isGrad && isEdit) return "Edit graduation exam?";
                if (isGrad) return "Add graduation exam?";
                if (isEdit) return "Edit assessment?";
                return "Add assessment?";
              })()}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              {(() => {
                const isGrad = assessmentConfirm?.kind === "graduation";
                const ch = assessmentConfirm?.chapterLocalId
                  ? chapters.find((c) => c.id === assessmentConfirm.chapterLocalId)
                  : undefined;
                const chapterName = ch?.name?.trim();
                const isEdit = assessmentConfirm?.mode === "edit";
                if (isGrad && isEdit) {
                  return "Opens the graduation exam creator in a new tab. Confirm or change how long students have to complete the final exam.";
                }
                if (isGrad) {
                  return "Opens the graduation exam creator in a new tab. Set how long students have for the final exam. This is saved separately from chapter quizzes.";
                }
                if (isEdit && chapterName) {
                  return `Opens the exam creator in a new tab for “${chapterName}”. Confirm or change how long students have to complete the assessment.`;
                }
                if (isEdit) {
                  return "Opens the exam creator in a new tab. Confirm or change how long students have to complete the assessment.";
                }
                if (chapterName) {
                  return `Opens the exam creator in a new tab for “${chapterName}”. Set how long students have to complete the assessment.`;
                }
                return "Opens the exam creator in a new tab. Set how long students have to complete the assessment.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="assessment-duration" className="text-sm font-semibold">
              Exam duration
            </Label>
            <Select
              value={assessmentDurationMinutes > 0 ? String(assessmentDurationMinutes) : undefined}
              onValueChange={(value) => {
                setAssessmentDurationMinutes(Number(value));
                setAssessmentDurationError(null);
              }}
            >
              <SelectTrigger
                id="assessment-duration"
                aria-invalid={assessmentDurationError != null}
                className={cn(
                  "h-11 text-base",
                  assessmentDurationError != null && "border-destructive ring-destructive/20",
                )}
              >
                <SelectValue placeholder="Select exam duration" />
              </SelectTrigger>
              <SelectContent>
                {assessmentDurationSelectOptions(assessmentDurationMinutes).map((option) => (
                  <SelectItem key={option.minutes} value={String(option.minutes)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assessmentDurationError ? (
              <p className="text-sm text-destructive" role="alert">
                <span className="font-semibold">Select exam duration.</span>{" "}
                {assessmentDurationError}
              </p>
            ) : null}
          </div>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="h-12 border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 min-w-[8rem] font-semibold"
              onClick={tryConfirmAssessment}
            >
              {assessmentConfirm?.mode === "edit" ? "Open editor" : "Open creator"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={studyMaterialDeleteConfirm != null}
        onOpenChange={(open) => {
          if (!open) setStudyMaterialDeleteConfirm(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">
              Delete study material?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              {studyMaterialDeleteConfirm?.remoteId
                ? `“${studyMaterialDeleteConfirm.name}” will be permanently removed from this course on the server.`
                : `“${studyMaterialDeleteConfirm?.name ?? "This file"}” will be removed from your list.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmRemoveStudyMaterial()}
            >
              Delete study material
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={assessmentDeleteConfirm != null}
        onOpenChange={(open) => {
          if (!open) setAssessmentDeleteConfirm(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">
              {assessmentDeleteConfirm?.target === "graduation"
                ? "Delete graduation exam?"
                : "Delete assessment?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              {(() => {
                if (assessmentDeleteConfirm?.target === "graduation") {
                  const onServer = Boolean(assessmentDeleteConfirm.assessmentRemoteId);
                  if (onServer) {
                    return "This permanently deletes the graduation exam on the server. Students will no longer see the final assessment for this course.";
                  }
                  return "This removes the graduation exam from this course. You can add a new one afterward.";
                }
                const ch = assessmentDeleteConfirm?.chapterId
                  ? chapters.find((c) => c.id === assessmentDeleteConfirm.chapterId)
                  : undefined;
                const chapterName = ch?.name?.trim();
                const onServer = Boolean(assessmentDeleteConfirm?.assessmentRemoteId);
                if (chapterName && onServer) {
                  return `This permanently deletes the assessment for “${chapterName}” on the server. Students will no longer see this quiz for this lesson.`;
                }
                if (chapterName) {
                  return `This removes the assessment linked to “${chapterName}”. You can add a new one afterward.`;
                }
                if (onServer) {
                  return "This permanently deletes the assessment on the server. Students will no longer see this quiz for this lesson.";
                }
                return "This removes the assessment for this chapter. You can add a new one afterward.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteAssessment()}
            >
              {assessmentDeleteConfirm?.target === "graduation"
                ? "Delete graduation exam"
                : "Delete assessment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={lectureDeleteConfirm != null}
        onOpenChange={(open) => {
          if (!open) setLectureDeleteConfirm(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Delete saved lecture?</AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              This deletes the saved lecture on the server. The chapter stays so you can upload a new
              video. Any linked assessment will need to be saved again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteSavedLecture()}
            >
              Delete lecture
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={mandatoryStepDialog != null}
        onOpenChange={(open) => {
          if (!open) setMandatoryStepDialog(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">
              {mandatoryStepDialog?.title ?? "Required details missing"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Complete the following on this step before switching sections:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  {mandatoryStepDialog?.messages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogAction
              className="h-12 min-w-[8rem] font-semibold"
              onClick={() => setMandatoryStepDialog(null)}
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={editDoneConfirmOpen}
        onOpenChange={setEditDoneConfirmOpen}
      >
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Done editing?</AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              You&apos;ll return to My Courses. Make sure you&apos;ve saved changes in each
              section before leaving — unsaved work in this session may be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 min-w-[10rem] gradient-gold font-bold text-primary-foreground"
              onClick={confirmEditDone}
            >
              Go to My Courses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={backConfirmOpen} onOpenChange={handleBackConfirmOpenChange}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">{exitConfirmCopy.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              {exitConfirmCopy.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDiscardCourse}
            >
              {exitConfirmCopy.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={uploadConfirmOpen}
        onOpenChange={(open) => {
          if (!submittingForReview) setUploadConfirmOpen(open);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
             <AlertDialogTitle className="text-2xl font-bold">Publish your course?</AlertDialogTitle>
             <AlertDialogDescription className="text-md">
               Submitting sends a request to the server and moves your course to{" "}
               <strong className="text-foreground">In Review</strong>. Our team will verify
               content before it is published.
             </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2" disabled={submittingForReview}>
              Wait, Review Again
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-12 min-w-[10rem] gradient-gold font-bold text-primary-foreground"
              disabled={submittingForReview}
              onClick={() => void handleUploadCourse()}
            >
              {submittingForReview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : (
                "Confirm & Submit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
