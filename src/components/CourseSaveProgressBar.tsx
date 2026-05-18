import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  subscribeUploadProgress,
  type UploadProgressState,
} from "@/lib/upload-progress";
import { cn } from "@/lib/utils";

type CourseSaveProgressBarProps = {
  className?: string;
};

/** Upload/save progress strip — embed in the course builder footer. */
export function CourseSaveProgressBar({ className }: CourseSaveProgressBarProps) {
  const [progress, setProgress] = useState<UploadProgressState | null>(null);

  useEffect(() => subscribeUploadProgress(setProgress), []);

  if (!progress) return null;

  const showPercent = progress.percent >= 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={showPercent ? progress.percent : undefined}
      className={cn(
        "border-b border-border bg-muted/40 px-6 py-3 animate-in slide-in-from-bottom-2 fade-in duration-300",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 lg:max-w-none">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
            <span className="truncate">{progress.label}</span>
          </span>
          {showPercent ? (
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {progress.percent}%
            </span>
          ) : null}
        </div>
        <Progress value={showPercent ? progress.percent : 0} className="h-1.5" />
      </div>
    </div>
  );
}
