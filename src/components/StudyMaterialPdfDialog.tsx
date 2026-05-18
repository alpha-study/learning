import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createLocalPdfBlobUrl,
  fetchStudyMaterialPdfBlobUrl,
  revokeStudyMaterialPdfBlobUrl,
} from "@/lib/fetch-study-material-pdf";
import { StudyMaterialPdfPages } from "@/components/StudyMaterialPdfPages";

export type StudyMaterialPdfSource = {
  title: string;
  /** Server URL for saved materials. */
  url?: string;
  /** Local file before upload (course builder). */
  file?: File;
};

type StudyMaterialPdfDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: StudyMaterialPdfSource | null;
};

const fullscreenDialogClass = cn(
  "fixed inset-0 z-50 flex h-[100dvh] w-[100vw] max-h-[100dvh] max-w-[100vw] translate-x-0 translate-y-0",
  "flex-col gap-0 overflow-hidden border-0 bg-neutral-950 p-0 shadow-none sm:rounded-none",
  "data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100",
  "data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0",
  "data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0",
  "[&>button:last-child]:hidden"
);

const pdfCloseButtonClass = cn(
  "absolute z-[60] flex h-11 w-11 items-center justify-center rounded-full",
  "top-[max(1rem,env(safe-area-inset-top,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
  "border-0 bg-black/70 text-white shadow-lg",
  "opacity-100 transition-colors hover:bg-black/90",
  "focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0"
);

/** Full-screen in-app PDF viewer — edge to edge, no chrome padding. */
export function StudyMaterialPdfDialog({
  open,
  onOpenChange,
  source,
}: StudyMaterialPdfDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !source) {
      setBlobUrl((prev) => {
        revokeStudyMaterialPdfBlobUrl(prev);
        return null;
      });
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);
      setBlobUrl((prev) => {
        revokeStudyMaterialPdfBlobUrl(prev);
        return null;
      });

      try {
        if (source.file) {
          createdUrl = createLocalPdfBlobUrl(source.file);
        } else if (source.url?.trim()) {
          createdUrl = await fetchStudyMaterialPdfBlobUrl(source.url.trim());
        } else {
          throw new Error("No PDF available to preview.");
        }
        if (!cancelled) {
          setBlobUrl(createdUrl);
        } else {
          revokeStudyMaterialPdfBlobUrl(createdUrl);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load PDF");
        }
        revokeStudyMaterialPdfBlobUrl(createdUrl);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      revokeStudyMaterialPdfBlobUrl(createdUrl);
    };
  }, [open, source?.url, source?.file, source?.title]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setBlobUrl((prev) => {
        revokeStudyMaterialPdfBlobUrl(prev);
        return null;
      });
    }
    onOpenChange(next);
  };

  const pdfTitle = source?.title ?? "Study material";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={fullscreenDialogClass} aria-describedby={undefined}>
        {loading ? (
          <div className="flex h-full w-full flex-1 items-center justify-center bg-neutral-950">
            <Loader2 className="h-10 w-10 animate-spin text-white/80" aria-hidden />
            <span className="sr-only">Loading PDF…</span>
          </div>
        ) : error ? (
          <div className="flex h-full w-full flex-1 items-center justify-center bg-neutral-950 px-6 text-center text-sm text-white/70">
            {error}
          </div>
        ) : blobUrl ? (
          <StudyMaterialPdfPages blobUrl={blobUrl} title={pdfTitle} />
        ) : null}
        <DialogClose className={pdfCloseButtonClass}>
          <X className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
