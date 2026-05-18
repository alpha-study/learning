import type {
  CourseAssessmentListItem,
  CourseAssessmentQuestion,
} from "@/lib/api/course-curriculum";

const STORAGE_KEY = "learning_assessment_answer_snapshots_v1";

export type AssessmentOptionSnapshot = {
  label: string;
  isCorrect: boolean;
};

export type AssessmentQuestionSnapshot = {
  questionText: string;
  options: AssessmentOptionSnapshot[];
};

type AssessmentSnapshotRecord = {
  questions: AssessmentQuestionSnapshot[];
  savedAt: string;
};

type SnapshotStore = Record<string, AssessmentSnapshotRecord>;

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function readStore(): SnapshotStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as SnapshotStore;
  } catch {
    return {};
  }
}

function writeStore(store: SnapshotStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function normalizeQuestions(
  questions: AssessmentQuestionSnapshot[]
): AssessmentQuestionSnapshot[] {
  return questions
    .map((q) => ({
      questionText: q.questionText.trim(),
      options: q.options
        .map((o) => ({
          label: o.label.trim(),
          isCorrect: Boolean(o.isCorrect),
        }))
        .filter((o) => o.label.length > 0),
    }))
    .filter((q) => q.questionText.length > 0 && q.options.length > 0);
}

/** Persist correct-answer flags after POST assessment/create (API list often omits them). */
export function persistAssessmentSnapshot(
  assessmentId: string,
  questions: AssessmentQuestionSnapshot[]
): void {
  const id = assessmentId.trim();
  if (!id) return;
  const normalized = normalizeQuestions(questions);
  if (normalized.length === 0) return;

  const store = readStore();
  store[id] = {
    questions: normalized,
    savedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function loadAssessmentSnapshot(
  assessmentId: string
): AssessmentQuestionSnapshot[] | undefined {
  const id = assessmentId.trim();
  if (!id) return undefined;
  const entry = readStore()[id];
  if (!entry?.questions?.length) return undefined;
  return normalizeQuestions(entry.questions);
}

/** Drop cached correct-answer flags after DELETE /api/course/assessment/delete/{id}. */
export function clearAssessmentSnapshot(assessmentId: string): void {
  const id = assessmentId.trim();
  if (!id) return;
  const store = readStore();
  if (!(id in store)) return;
  delete store[id];
  writeStore(store);
}

function mergeQuestionOptions(
  apiQuestion: CourseAssessmentQuestion,
  snapshot?: AssessmentQuestionSnapshot
): CourseAssessmentQuestion {
  if (!snapshot) return apiQuestion;

  const snapByLabel = new Map(
    snapshot.options.map((o) => [normalizeLabel(o.label), o.isCorrect] as const)
  );

  return {
    ...apiQuestion,
    options: apiQuestion.options.map((opt, index) => {
      if (opt.isCorrect) return opt;
      const snapOpt = snapshot.options[index];
      if (snapOpt?.isCorrect) {
        return { ...opt, isCorrect: true };
      }
      const fromLabel = snapByLabel.get(normalizeLabel(opt.label));
      if (fromLabel) {
        return { ...opt, isCorrect: true };
      }
      return opt;
    }),
  };
}

function mergeAssessmentWithSnapshot(
  assessment: CourseAssessmentListItem,
  snapshot: AssessmentQuestionSnapshot[]
): CourseAssessmentListItem {
  const snapByText = new Map(
    snapshot.map((q) => [normalizeLabel(q.questionText), q] as const)
  );

  return {
    ...assessment,
    questions: assessment.questions.map((q, index) => {
      const snapQ =
        snapshot[index] ?? snapByText.get(normalizeLabel(q.questionText));
      return mergeQuestionOptions(q, snapQ);
    }),
  };
}

/** Apply locally saved correct answers when GET assessments omits `answerId`. */
export function applyAssessmentSnapshots(
  assessments: CourseAssessmentListItem[]
): CourseAssessmentListItem[] {
  return assessments.map((assessment) => {
    const snapshot = loadAssessmentSnapshot(assessment.id);
    if (!snapshot?.length) return assessment;
    return mergeAssessmentWithSnapshot(assessment, snapshot);
  });
}
