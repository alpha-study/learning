import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { loadAssessmentSnapshot } from "@/lib/assessment-snapshot-storage";
import { cn, formatFileSize } from "@/lib/utils";
import {
  AlertCircle,
  Archive,
  BookOpen,
  CheckCircle2,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  Info,
  Layers,
  Loader2,
  Play,
  Tag,
  Video,
} from "lucide-react";

export type CourseUploadReviewChapter = {
  id: string;
  name: string;
  videoPreview: string | null;
  lectureSaved: boolean;
  assessmentSaved: boolean;
  assessmentRemoteId?: string;
  assessmentDurationMinutes?: number;
};

export type CourseUploadReviewStudyMaterial = {
  id: string;
  name: string;
  file?: File;
  viewUrl?: string;
  saved: boolean;
  uploading?: boolean;
};

export type CourseUploadReviewStepProps = {
  title: string;
  language: string;
  price: string;
  about: string;
  coreDepartment: string;
  coreBranch: string;
  coreClass: string;
  coreSubjectEnabled: boolean;
  languageOptions: SearchableSelectOption[];
  departmentOptions: SearchableSelectOption[];
  branchOptions: SearchableSelectOption[];
  classOptions: SearchableSelectOption[];
  introVideoPreview: string | null;
  introVideo: File | null;
  existingPromotionVideoFileId?: number;
  thumbnailPreview: string | null;
  thumbnail: File | null;
  existingCoverThumbnailFileId?: number;
  chapters: CourseUploadReviewChapter[];
  graduationExam: {
    saved: boolean;
    assessmentRemoteId?: string;
    durationMinutes?: number;
  };
  studyMaterials: CourseUploadReviewStudyMaterial[];
  courseDraftId: string | null;
  reviewBlockMessage?: string;
  onPreviewIntro: () => void;
  onPreviewThumbnail: () => void;
  onPreviewLecture: (url: string) => void;
  onViewGraduationExam: () => void;
  onViewChapterAssessment?: (
    assessmentRemoteId: string | undefined,
    chapterLabel: string
  ) => void;
  onViewStudyMaterial: (material: CourseUploadReviewStudyMaterial) => void;
};

function resolveSelectLabel(options: SearchableSelectOption[], value: string): string {
  const v = value.trim();
  if (!v) return "";
  return options.find((o) => o.value === v)?.label ?? v;
}

function assessmentQuestionCount(remoteId?: string): number | undefined {
  const id = remoteId?.trim();
  if (!id) return undefined;
  return loadAssessmentSnapshot(id)?.length;
}

function ReviewCoverHero({
  coverUrl,
  title,
  hasIntro,
  onPlayIntro,
}: {
  coverUrl?: string | null;
  title: string;
  hasIntro: boolean;
  onPlayIntro: () => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <div
      className={cn(
        "group relative mb-0 aspect-[16/10] overflow-hidden rounded-2xl border-2 border-border bg-black shadow-lg",
        hasIntro && "cursor-pointer"
      )}
      onClick={hasIntro ? onPlayIntro : undefined}
      onKeyDown={
        hasIntro
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPlayIntro();
              }
            }
          : undefined
      }
      role={hasIntro ? "button" : undefined}
      tabIndex={hasIntro ? 0 : undefined}
    >
      {coverUrl && !coverFailed ? (
        <img
          src={coverUrl}
          alt={title || "Course cover"}
          className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-75"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <BookOpen className="h-14 w-14 text-muted-foreground/40" aria-hidden />
        </div>
      )}
      {hasIntro ? (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 shadow-xl backdrop-blur-md transition-transform group-hover:scale-105">
              <Play className="ml-1 h-8 w-8 fill-white text-white" aria-hidden />
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 right-3">
            <span className="inline-flex rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-md">
              Watch intro
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatPill({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 text-center",
        ok === true && "border-green-500/30 bg-green-50/60 dark:bg-green-950/25",
        ok === false && "border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/25",
        ok === undefined && "border-border bg-muted/30"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Info;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border pb-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
      </div>
      <div className="min-w-0">
        <h3 className="text-xl font-bold font-heading">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export function CourseUploadReviewStep({
  title,
  language,
  price,
  about,
  coreDepartment,
  coreBranch,
  coreClass,
  coreSubjectEnabled,
  languageOptions,
  departmentOptions,
  branchOptions,
  classOptions,
  introVideoPreview,
  introVideo,
  existingPromotionVideoFileId,
  thumbnailPreview,
  thumbnail,
  existingCoverThumbnailFileId,
  chapters,
  graduationExam,
  studyMaterials,
  courseDraftId,
  reviewBlockMessage,
  onPreviewIntro,
  onPreviewThumbnail,
  onPreviewLecture,
  onViewGraduationExam,
  onViewChapterAssessment,
  onViewStudyMaterial,
}: CourseUploadReviewStepProps) {
  const languageLabel = resolveSelectLabel(languageOptions, language);
  const hasCoreSubject =
    coreSubjectEnabled &&
    Boolean(coreDepartment.trim() || coreBranch.trim() || coreClass.trim());
  const hasIntro = Boolean(introVideoPreview?.trim());
  const hasThumbnail = Boolean(thumbnailPreview?.trim());

  const savedLectures = chapters.filter((ch) => ch.lectureSaved).length;
  const chaptersWithQuiz = chapters.filter(
    (ch) => ch.assessmentSaved || Boolean(ch.assessmentRemoteId?.trim())
  ).length;
  const savedMaterials = studyMaterials.filter((m) => m.saved).length;

  const completionItems = useMemo(
    () => [
      { label: "Basic info", ok: Boolean(title.trim() && language.trim() && price.trim() && about.trim()) },
      { label: "Media", ok: hasIntro && hasThumbnail },
      { label: "Curriculum", ok: chapters.length > 0 && savedLectures === chapters.length },
      { label: "Graduation", ok: graduationExam.saved },
      {
        label: "Materials",
        ok: studyMaterials.length === 0 || savedMaterials === studyMaterials.length,
      },
    ],
    [
      title,
      language,
      price,
      about,
      hasIntro,
      hasThumbnail,
      chapters.length,
      savedLectures,
      graduationExam.saved,
      studyMaterials.length,
      savedMaterials,
    ]
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      {reviewBlockMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-50/80 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p>{reviewBlockMessage}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border-2 border-primary/15 bg-gradient-to-br from-primary/8 via-background to-muted/40 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Final review
            </p>
            <h2 className="text-2xl font-bold font-heading sm:text-3xl">
              {title.trim() || "Untitled course"}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              This is how your listing will look to reviewers. Check every section before you
              submit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:max-w-[240px] sm:justify-end">
            {completionItems.map((item) => (
              <Badge
                key={item.label}
                variant={item.ok ? "default" : "secondary"}
                className={cn(
                  "gap-1 font-semibold",
                  item.ok
                    ? "bg-green-600/90 hover:bg-green-600/90"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {item.ok ? (
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                ) : (
                  <AlertCircle className="h-3 w-3" aria-hidden />
                )}
                {item.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(260px,300px)_1fr] lg:gap-10">
        <aside className="space-y-5 lg:sticky lg:top-6">
          <ReviewCoverHero
            coverUrl={thumbnailPreview}
            title={title}
            hasIntro={hasIntro}
            onPlayIntro={onPreviewIntro}
          />

          <Card className="border-2 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <Globe className="h-4 w-4" aria-hidden />
                  Language
                </span>
                <Badge variant="secondary" className="font-bold">
                  {languageLabel || "—"}
                </Badge>
              </div>
              {courseDraftId ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                    <Tag className="h-4 w-4" aria-hidden />
                    Course ID
                  </span>
                  <span className="text-sm font-bold tabular-nums">{courseDraftId}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-lg font-bold text-primary tabular-nums">
                  {price.trim() ? `₹${price}` : "—"}
                </span>
              </div>
              {hasCoreSubject ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Core subject
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {coreDepartment.trim() ? (
                      <Badge variant="outline" className="text-xs font-semibold">
                        {resolveSelectLabel(departmentOptions, coreDepartment)}
                      </Badge>
                    ) : null}
                    {coreBranch.trim() ? (
                      <Badge variant="outline" className="text-xs font-semibold">
                        {resolveSelectLabel(branchOptions, coreBranch)}
                      </Badge>
                    ) : null}
                    {coreClass.trim() ? (
                      <Badge variant="outline" className="text-xs font-semibold">
                        {resolveSelectLabel(classOptions, coreClass)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Chapters" value={String(chapters.length)} ok={chapters.length > 0} />
            <StatPill
              label="Lectures saved"
              value={`${savedLectures}/${chapters.length || 0}`}
              ok={chapters.length > 0 && savedLectures === chapters.length}
            />
            <StatPill
              label="Chapter quizzes"
              value={String(chaptersWithQuiz)}
              ok={chaptersWithQuiz > 0 || chapters.length === 0}
            />
            <StatPill
              label="PDFs"
              value={String(studyMaterials.length)}
              ok={studyMaterials.length === 0 || savedMaterials === studyMaterials.length}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-10">
          <section className="space-y-4">
            <SectionHeading
              icon={Info}
              title="About this course"
              subtitle="Description shown to students on the course page"
            />
            <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
              {about.trim() || "No description provided."}
            </p>
          </section>

          <section className="space-y-4">
            <SectionHeading
              icon={Video}
              title="Media assets"
              subtitle="Promotion video and cover image"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="overflow-hidden border-2">
                <CardHeader className="border-b bg-muted/30 py-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <Video className="h-4 w-4 text-primary" aria-hidden />
                    Promotion video
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {introVideoPreview ? (
                    <div className="space-y-3">
                      <div className="aspect-video overflow-hidden rounded-lg border border-border bg-black/5">
                        <video src={introVideoPreview} controls className="h-full w-full" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {introVideo
                          ? `${introVideo.name} · ${formatFileSize(introVideo.size)}`
                          : existingPromotionVideoFileId
                            ? "Saved on server"
                            : "Uploaded"}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 font-semibold"
                        onClick={onPreviewIntro}
                      >
                        <Play className="h-4 w-4" aria-hidden />
                        Full screen
                      </Button>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">Not uploaded</p>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-2">
                <CardHeader className="border-b bg-muted/30 py-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <ImageIcon className="h-4 w-4 text-primary" aria-hidden />
                    Cover thumbnail
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {thumbnailPreview ? (
                    <div className="space-y-3">
                      <div className="aspect-video overflow-hidden rounded-lg border border-border">
                        <img
                          src={thumbnailPreview}
                          alt="Cover thumbnail"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {thumbnail
                          ? `${thumbnail.name} · ${formatFileSize(thumbnail.size)}`
                          : existingCoverThumbnailFileId
                            ? "Saved on server"
                            : "Uploaded"}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 font-semibold"
                        onClick={onPreviewThumbnail}
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                        View full size
                      </Button>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">Not uploaded</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              icon={Layers}
              title="Curriculum"
              subtitle={`${chapters.length} chapter${chapters.length === 1 ? "" : "s"} · ${savedLectures} lecture${savedLectures === 1 ? "" : "s"} saved`}
            />
            {chapters.length > 0 ? (
              <div className="space-y-3">
                {chapters.map((ch, idx) => {
                  const hasQuiz =
                    ch.assessmentSaved || Boolean(ch.assessmentRemoteId?.trim());
                  const quizCount = assessmentQuestionCount(ch.assessmentRemoteId);

                  return (
                    <div
                      key={ch.id}
                      className="flex flex-col gap-4 rounded-xl border-2 border-border bg-card p-4 sm:flex-row"
                    >
                      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:w-36">
                        {ch.videoPreview ? (
                          <>
                            <video
                              src={ch.videoPreview}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                            <button
                              type="button"
                              className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
                              onClick={() => onPreviewLecture(ch.videoPreview!)}
                              aria-label={`Preview chapter ${idx + 1}`}
                            >
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
                                <Play className="ml-0.5 h-5 w-5 text-foreground" aria-hidden />
                              </span>
                            </button>
                          </>
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground/40" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Chapter {idx + 1}
                          </p>
                          <p className="font-bold text-lg leading-snug">
                            {ch.name.trim() || "Untitled chapter"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 font-semibold",
                              ch.lectureSaved
                                ? "border-green-500/40 text-green-800 dark:text-green-300"
                                : "border-amber-500/40 text-amber-800 dark:text-amber-300"
                            )}
                          >
                            {ch.lectureSaved ? (
                              <CheckCircle2 className="h-3 w-3" aria-hidden />
                            ) : (
                              <AlertCircle className="h-3 w-3" aria-hidden />
                            )}
                            {ch.lectureSaved ? "Lecture saved" : "Lecture not saved"}
                          </Badge>
                          <Badge variant="outline" className="gap-1 font-semibold">
                            {hasQuiz ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-green-600" aria-hidden />
                                Quiz
                                {ch.assessmentDurationMinutes
                                  ? ` · ${ch.assessmentDurationMinutes} min`
                                  : ""}
                                {quizCount != null
                                  ? ` · ${quizCount} Q`
                                  : ""}
                              </>
                            ) : (
                              "No chapter quiz"
                            )}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ch.videoPreview ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="gap-2 font-semibold"
                              onClick={() => onPreviewLecture(ch.videoPreview!)}
                            >
                              <Play className="h-4 w-4" aria-hidden />
                              Preview lecture
                            </Button>
                          ) : null}
                          {hasQuiz && onViewChapterAssessment ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2 font-semibold"
                              onClick={() =>
                                onViewChapterAssessment(
                                  ch.assessmentRemoteId,
                                  ch.name.trim() || `Chapter ${idx + 1}`
                                )
                              }
                            >
                              <Eye className="h-4 w-4" aria-hidden />
                              View assessment
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-center">
                <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden />
                <p className="text-sm font-medium text-muted-foreground">No chapters added yet.</p>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeading
              icon={GraduationCap}
              title="Graduation exam"
              subtitle="Final assessment for the whole course"
            />
            <Card
              className={cn(
                "border-2",
                graduationExam.saved
                  ? "border-green-500/25 bg-green-50/40 dark:bg-green-950/20"
                  : "border-dashed"
              )}
            >
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                {graduationExam.saved ? (
                  <>
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 font-semibold text-green-800 dark:text-green-300">
                        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                        Graduation exam configured
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {graduationExam.durationMinutes
                          ? `${graduationExam.durationMinutes} minutes allowed`
                          : "Duration not set"}
                        {(() => {
                          const count = assessmentQuestionCount(
                            graduationExam.assessmentRemoteId
                          );
                          return count != null
                            ? ` · ${count} question${count === 1 ? "" : "s"}`
                            : "";
                        })()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 gap-2 font-semibold"
                      onClick={onViewGraduationExam}
                    >
                      <Eye className="h-4 w-4" aria-hidden />
                      View exam
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No graduation exam added.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <SectionHeading
              icon={Archive}
              title="Study materials"
              subtitle={
                studyMaterials.length > 0
                  ? `${studyMaterials.length} PDF${studyMaterials.length === 1 ? "" : "s"} attached`
                  : "Optional — you can skip this when creating your course"
              }
            />
            {studyMaterials.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {studyMaterials.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-xl border-2 border-border bg-muted/20 px-4 py-3"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        {m.uploading ? (
                          <Loader2
                            className="h-4 w-4 animate-spin text-primary"
                            aria-hidden
                          />
                        ) : (
                          <FileText className="h-4 w-4 text-primary" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{m.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.saved ? "Saved" : m.uploading ? "Uploading…" : "Pending"}
                        </span>
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 font-semibold"
                      disabled={!m.file && !m.viewUrl?.trim()}
                      onClick={() => onViewStudyMaterial(m)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden />
                <p className="text-sm font-medium text-muted-foreground">
                  No study materials uploaded.
                </p>
              </div>
            )}
          </section>

          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <AlertCircle className="mt-0.5 h-8 w-8 shrink-0 text-primary" aria-hidden />
              <div className="space-y-2">
                <h4 className="text-lg font-bold">Ready to submit?</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  When you click <strong className="text-foreground">Submit &amp; Publish</strong>,
                  your course enters our review queue. Our team checks video quality and the
                  graduation exam within about 48 hours. Use <strong className="text-foreground">Back Step</strong> to edit any section.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
