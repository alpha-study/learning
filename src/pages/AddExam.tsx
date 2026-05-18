import { useState, useRef, useEffect } from "react";
import { useBlocker, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import { ChevronLeft, ChevronRight, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import {
  createCourseAssessment,
  deleteCourseAssessment,
  extractAssessmentIdFromCreateResponse,
  extractCreateAssessmentMessage,
  getCourseCreateErrorMessage,
  getDeleteAssessmentErrorMessage,
  type AssessmentQuestion,
} from "@/lib/api/course";
import {
  clearAssessmentSnapshot,
  persistAssessmentSnapshot,
  type AssessmentQuestionSnapshot,
} from "@/lib/assessment-snapshot-storage";
import {
  getExamBuilderContext,
  setExamSavedResult,
  clearExamBuilderContext,
} from "@/lib/exam-builder-context";

function finishAfterExamSave(navigate: ReturnType<typeof useNavigate>) {
  if (window.opener && !window.opener.closed) {
    window.close();
    return;
  }
  if (window.history.length > 1) {
    navigate(-1);
    return;
  }
  window.close();
  window.setTimeout(() => navigate("/my-courses/upload"), 150);
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswers: number[];
}

function toApiQuestions(questions: Question[]): AssessmentQuestion[] {
  return questions.map((q) => ({
    question: q.text.trim(),
    options: q.options.map((opt, idx) => ({
      option: opt.trim(),
      isCorrect: q.correctAnswers.includes(idx),
    })),
  }));
}

function toAssessmentSnapshot(questions: Question[]): AssessmentQuestionSnapshot[] {
  return questions.map((q) => ({
    questionText: q.text.trim(),
    options: q.options.map((opt, idx) => ({
      label: opt.trim(),
      isCorrect: q.correctAnswers.includes(idx),
    })),
  }));
}

function validateQuestions(questions: Question[]): string | undefined {
  if (questions.length === 0) {
    return "Add at least one question.";
  }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.text.trim()) {
      return `Question ${i + 1} needs a prompt.`;
    }
    for (let j = 0; j < q.options.length; j++) {
      if (!q.options[j].trim()) {
        return `Question ${i + 1}, option ${j + 1} cannot be empty.`;
      }
    }
    if (q.correctAnswers.length === 0) {
      return `Question ${i + 1} must have at least one correct answer.`;
    }
  }
  return undefined;
}

const DEFAULT_ASSESSMENT_DURATION_MINUTES = 10;

function newEmptyQuestion(): Question {
  return {
    id: crypto.randomUUID(),
    text: "",
    options: ["", "", "", ""],
    correctAnswers: [],
  };
}

export default function AddExam() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [examContext] = useState(() => getExamBuilderContext());
  const [saving, setSaving] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([newEmptyQuestion()]);
  const editorColumnRef = useRef<HTMLDivElement>(null);
  const [questionsPanelHeight, setQuestionsPanelHeight] = useState<number | null>(null);
  const [deleteQuestionConfirm, setDeleteQuestionConfirm] = useState<{
    id: string;
    number: number;
  } | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const allowLeaveRef = useRef(false);

  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeaveRef.current &&
      !saving &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (navigationBlocker.state === "blocked") {
      setCancelConfirmOpen(true);
    }
  }, [navigationBlocker.state]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current || saving) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saving]);

  useEffect(() => {
    const el = editorColumnRef.current;
    if (!el) return;

    const updateHeight = () => {
      setQuestionsPanelHeight(el.getBoundingClientRect().height);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [currentQuestionIndex, questions.length]);

  const currentQuestion = questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((i) => Math.max(0, i - 1));
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      return;
    }
    setQuestions((prev) => {
      const next = [...prev, newEmptyQuestion()];
      setCurrentQuestionIndex(next.length - 1);
      return next;
    });
  };

  const requestDeleteQuestion = (id: string) => {
    if (questions.length <= 1) return;
    const removeIdx = questions.findIndex((q) => q.id === id);
    if (removeIdx < 0) return;
    setDeleteQuestionConfirm({ id, number: removeIdx + 1 });
  };

  const confirmDeleteQuestion = () => {
    if (!deleteQuestionConfirm) return;
    const { id } = deleteQuestionConfirm;
    setDeleteQuestionConfirm(null);
    if (questions.length <= 1) return;
    const removeIdx = questions.findIndex((q) => q.id === id);
    if (removeIdx < 0) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setCurrentQuestionIndex((prev) => {
      if (removeIdx < prev) return prev - 1;
      if (removeIdx === prev) return Math.max(0, prev - 1);
      return prev;
    });
  };

  const updateQuestion = (id: string, field: string, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const toggleCorrectAnswer = (qId: string, optIdx: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const isAlreadyCorrect = q.correctAnswers.includes(optIdx);
        let nextCorrectAnswers: number[];
        
        if (isAlreadyCorrect) {
          nextCorrectAnswers = q.correctAnswers.filter(idx => idx !== optIdx);
        } else {
          nextCorrectAnswers = [...q.correctAnswers, optIdx];
        }
        
        return { ...q, correctAnswers: nextCorrectAnswers };
      }
      return q;
    }));
  };

  const updateOption = (qId: string, optIdx: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...q.options];
        newOptions[optIdx] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const requestSave = () => {
    const questionError = validateQuestions(questions);
    if (questionError) {
      toast({ title: "Incomplete exam", description: questionError, variant: "destructive" });
      return;
    }
    if (!examContext) {
      toast({
        title: "Course context missing",
        description:
          "Open the exam creator from Course Upload (chapter quiz or graduation exam) so course and lecture ids are available.",
        variant: "destructive",
      });
      return;
    }
    setSaveConfirmOpen(true);
  };

  const performSave = async () => {
    if (!examContext) return;
    setSaveConfirmOpen(false);

    const duration =
      examContext.durationMinutes && examContext.durationMinutes > 0
        ? examContext.durationMinutes
        : DEFAULT_ASSESSMENT_DURATION_MINUTES;

    setSaving(true);
    try {
      const replaceId = examContext.replaceAssessmentRemoteId?.trim();
      if (replaceId) {
        try {
          await deleteCourseAssessment(replaceId);
          clearAssessmentSnapshot(replaceId);
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 404)) {
            toast({
              title: "Could not replace assessment",
              description: getDeleteAssessmentErrorMessage(e),
              variant: "destructive",
            });
            return;
          }
          clearAssessmentSnapshot(replaceId);
        }
      }

      const res = await createCourseAssessment({
        courseId: examContext.courseId,
        courseLectureId: examContext.courseLectureId,
        duration,
        type: examContext.assessmentType,
        questions: toApiQuestions(questions),
      });
      const remoteId = extractAssessmentIdFromCreateResponse(res);
      if (remoteId) {
        persistAssessmentSnapshot(remoteId, toAssessmentSnapshot(questions));
      }
      setExamSavedResult({
        kind: examContext.kind,
        chapterLocalId: examContext.chapterLocalId,
        assessmentRemoteId: remoteId,
        durationMinutes: duration,
        savedAt: new Date().toISOString(),
      });
      clearExamBuilderContext();
      toast({
        title: replaceId ? "Exam updated" : "Exam saved",
        description:
          extractCreateAssessmentMessage(res) ??
          (replaceId
            ? "Your assessment was replaced on the server."
            : "Your assessment was created on the server."),
      });
      allowLeaveRef.current = true;
      finishAfterExamSave(navigate);
    } catch (e) {
      toast({
        title: "Could not save exam",
        description: getCourseCreateErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDialogOpenChange = (open: boolean) => {
    setCancelConfirmOpen(open);
    if (!open && navigationBlocker.state === "blocked") {
      navigationBlocker.reset();
    }
  };

  const confirmCancelExam = () => {
    allowLeaveRef.current = true;
    setCancelConfirmOpen(false);
    clearExamBuilderContext();

    if (navigationBlocker.state === "blocked") {
      navigationBlocker.proceed();
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    window.close();
    window.setTimeout(() => navigate("/my-courses/upload"), 150);
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 shadow-sm backdrop-blur-md md:px-12">
        <h1 className="text-xl font-bold font-heading">
          {examContext?.kind === "graduation" ? "Graduation Exam Creator" : "Exam Creator"}
        </h1>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 min-w-[5.5rem] border-2 font-semibold"
            onClick={() => setCancelConfirmOpen(true)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="h-10 min-w-[7.5rem] bg-green-600 px-8 font-bold text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
            onClick={requestSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl animate-in px-4 pt-20 duration-700 fade-in sm:px-6">
        <div className="flex flex-row items-start gap-4 pb-12 sm:gap-6 lg:gap-8">
          <div ref={editorColumnRef} className="flex min-w-0 flex-1 flex-col gap-8">
          {currentQuestion ? (
            <Card
              key={currentQuestion.id}
              className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
            >
              <CardContent className="space-y-8 px-5 py-6 sm:px-6 sm:py-8">
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor={`question-prompt-${currentQuestion.id}`}
                      className="text-base font-semibold text-foreground"
                    >
                      Question {currentQuestionIndex + 1}
                    </Label>
                    {questions.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => requestDeleteQuestion(currentQuestion.id)}
                        disabled={saving}
                        aria-label={`Delete question ${currentQuestionIndex + 1}`}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                  <Textarea
                    id={`question-prompt-${currentQuestion.id}`}
                    placeholder="What should students answer?"
                    value={currentQuestion.text}
                    onChange={(e) => updateQuestion(currentQuestion.id, "text", e.target.value)}
                    className="min-h-[100px] resize-y border-border/80 bg-background text-base leading-relaxed"
                    rows={3}
                  />
                </section>

                <section className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-foreground">Answer choices</h3>
                    <p className="text-sm text-muted-foreground">
                      Add four options. Tap{" "}
                      <span className="font-medium text-foreground">Mark correct</span> for every right answer (tap again to unmark).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const isCorrect = currentQuestion.correctAnswers.includes(optIdx);
                      const choiceLetter = String.fromCharCode(65 + optIdx);
                      return (
                        <div
                          key={optIdx}
                          className={cn(
                            "rounded-xl border-2 p-4 transition-colors",
                            isCorrect
                              ? "border-green-500/50 bg-green-50/80 dark:bg-green-950/25"
                              : "border-border/80 bg-muted/15 hover:border-muted-foreground/25"
                          )}
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold tabular-nums",
                                isCorrect
                                  ? "border-green-600/30 bg-green-600 text-white dark:border-green-500/40 dark:bg-green-600"
                                  : "border-border bg-background text-foreground"
                              )}
                              aria-hidden
                            >
                              {choiceLetter}
                            </span>
                            <button
                              type="button"
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                                isCorrect
                                  ? "bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
                                  : "border border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/50 hover:text-foreground"
                              )}
                              onClick={() => toggleCorrectAnswer(currentQuestion.id, optIdx)}
                            >
                              <CheckCircle2
                                className={cn("h-3.5 w-3.5", isCorrect && "fill-current")}
                                aria-hidden
                              />
                              {isCorrect ? "Correct" : "Mark correct"}
                            </button>
                          </div>
                          <Input
                            placeholder={`Answer ${choiceLetter}`}
                            value={opt}
                            onChange={(e) => updateOption(currentQuestion.id, optIdx, e.target.value)}
                            className={cn(
                              "h-11 border-border/80 bg-background text-base",
                              isCorrect && "border-green-500/40 focus-visible:ring-green-500/30"
                            )}
                            aria-label={`Answer choice ${choiceLetter}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              </CardContent>
            </Card>
          ) : null}

          {currentQuestion ? (
            <div className="flex flex-col-reverse gap-3 border-t border-border/80 pt-6 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl sm:flex-none sm:min-w-[132px]"
                onClick={goToPreviousQuestion}
                disabled={isFirstQuestion || saving}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl sm:flex-none sm:min-w-[160px]"
                onClick={goToNextQuestion}
                disabled={saving}
              >
                {isLastQuestion ? "Add next question" : "Next question"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : null}
          </div>

          <aside
            className="flex w-[11.25rem] shrink-0 flex-col overflow-hidden sm:w-60 md:w-64"
            style={
              questionsPanelHeight != null && questionsPanelHeight > 0
                ? { height: questionsPanelHeight }
                : undefined
            }
            aria-label="Question list"
          >
            <p className="mb-3 shrink-0 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Questions
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {questions.map((q, idx) => {
                  const isActive = idx === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={saving}
                      onClick={() => goToQuestion(idx)}
                      className={cn(
                        "flex aspect-square w-full min-h-9 items-center justify-center rounded-lg border-2 text-xs font-bold tabular-nums transition-colors sm:min-h-10 sm:text-sm",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                      )}
                      aria-current={isActive ? "step" : undefined}
                      aria-label={`Go to question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AlertDialog
        open={deleteQuestionConfirm != null}
        onOpenChange={(open) => {
          if (!open) setDeleteQuestionConfirm(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Delete question?</AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              {deleteQuestionConfirm
                ? `Question ${deleteQuestionConfirm.number} will be removed from this exam. This cannot be undone.`
                : "This question will be removed from this exam."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteQuestion}
            >
              Delete question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Save exam?</AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              This will save {questions.length} question{questions.length === 1 ? "" : "s"} to the
              server and return you to the course builder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2" disabled={saving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-12 min-w-[7rem] bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
              disabled={saving}
              onClick={() => void performSave()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save exam"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={handleCancelDialogOpenChange}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              Your exam questions will not be saved. You can open the exam creator again from the
              course builder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmCancelExam}
            >
              Leave exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}