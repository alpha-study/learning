import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, GraduationCap, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichContent } from "@/components/RichContent";
import type { CourseAssessmentListItem } from "@/lib/api/course-curriculum";

type CourseAssessmentPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: CourseAssessmentListItem | null;
  title: string;
  subtitle?: string;
  loading?: boolean;
};

function questionTypeLabel(type?: number): string {
  if (type === 1) return "MCQ";
  return "Question";
}

export function CourseAssessmentPreviewDialog({
  open,
  onOpenChange,
  assessment,
  title,
  subtitle,
  loading = false,
}: CourseAssessmentPreviewDialogProps) {
  const questions = assessment?.questions ?? [];
  const duration = assessment?.durationMinutes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <GraduationCap className="h-6 w-6 text-primary" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Loading questions from the server…"
              : subtitle ??
                (duration != null && duration > 0
                  ? `${questions.length} question${questions.length === 1 ? "" : "s"} · ${duration} min allowed`
                  : `${questions.length} question${questions.length === 1 ? "" : "s"}`)}
            {!loading && questions.length > 0
              ? " · Correct answers highlighted in green."
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,32rem)] space-y-6 overflow-y-auto py-2 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-12">
              <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium text-muted-foreground">
                Loading assessment…
              </p>
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
              <HelpCircle className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden />
              <p className="font-medium">No questions in this assessment yet.</p>
            </div>
          ) : (
            questions.map((q, qIndex) => {
              const correctOptions = q.options.filter((o) => o.isCorrect);
              return (
              <div
                key={q.id}
                className="space-y-4 rounded-xl border border-border bg-muted/30 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Question {qIndex + 1} of {questions.length}</span>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                    {questionTypeLabel(q.questionType)}
                  </Badge>
                </div>
                <RichContent
                  content={q.questionText}
                  className="text-base font-bold leading-snug"
                />
                {q.options.length > 0 ? (
                  <ul className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, optIndex) => (
                      <li
                        key={opt.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border-2 bg-background p-3 text-sm shadow-sm",
                          opt.isCorrect
                            ? "border-green-600/80 bg-green-50/80 dark:bg-green-950/20"
                            : "border-border"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                            opt.isCorrect
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <RichContent
                          content={opt.label}
                          className="min-w-0 flex-1 font-medium leading-snug"
                        />
                        {opt.isCorrect ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-green-700">
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                            Correct
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No options listed.</p>
                )}
                {q.options.length > 0 && correctOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Correct answer could not be loaded for this question. Open the exam in the
                    course builder and save it again on this device to restore the answer key.
                  </p>
                ) : null}
                {correctOptions.length > 0 ? (
                  <div className="space-y-2 rounded-lg border border-green-600/30 bg-green-50/60 px-3 py-2 text-sm font-medium text-green-900 dark:bg-green-950/30 dark:text-green-100">
                    <p className="font-bold">
                      Correct answer{correctOptions.length > 1 ? "s" : ""}:
                    </p>
                    {correctOptions.map((o) => (
                      <RichContent key={o.id} content={o.label} className="text-green-900 dark:text-green-100" />
                    ))}
                  </div>
                ) : null}
              </div>
            );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
