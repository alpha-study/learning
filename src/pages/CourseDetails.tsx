import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Layers,
  Archive,
  GraduationCap,
  Eye,
  Play,
  Calendar,
  Tag,
  Edit,
  ExternalLink,
  Loader2,
  BookOpen,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CourseVideoPlayer } from "@/components/CourseVideoPlayer";
import { CourseAssessmentPreviewDialog } from "@/components/CourseAssessmentPreviewDialog";
import {
  StudyMaterialPdfDialog,
  type StudyMaterialPdfSource,
} from "@/components/StudyMaterialPdfDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  formatCourseListingDate,
  formatCourseListingPrice,
  courseStatusBadgeClass,
  formatCourseListingStatus,
  getCourseCreateErrorMessage,
  resolveCourseCoverSrc,
  resolveCourseMediaSrc,
  type CourseDetail,
} from "@/lib/api/course";
import {
  displayChapterTitle,
  enrichLecturesWithPersistedChapterNames,
  fetchCourseViewPageData,
  partitionCourseAssessments,
  type CourseAssessmentListItem,
  type CourseLectureListItem,
  type CourseStudyMaterialListItem,
} from "@/lib/api/course-curriculum";
import { loadPersistedCurriculum } from "@/lib/course-builder-storage";

function CourseCoverHero({
  coverUrl,
  title,
  onPlayIntro,
  hasIntro,
}: {
  coverUrl?: string;
  title: string;
  onPlayIntro: () => void;
  hasIntro: boolean;
}) {
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <div
      className={cn(
        "relative group aspect-[16/10] rounded-2xl overflow-hidden border-4 border-white shadow-2xl mb-6 bg-black",
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
          className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
          alt={title}
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <BookOpen className="h-16 w-16 text-muted-foreground/40" aria-hidden />
        </div>
      )}
      {hasIntro && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xl">
              <Play className="h-10 w-10 text-white fill-white ml-1" />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
            <span className="bg-primary px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
              Watch Intro Video
            </span>
          </div>
        </>
      )}
    </div>
  );
}


export default function CourseDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lectures, setLectures] = useState<CourseLectureListItem[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<CourseStudyMaterialListItem[]>(
    []
  );
  const [assessments, setAssessments] = useState<CourseAssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewingVideo, setViewingVideo] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<StudyMaterialPdfSource | null>(null);
  const [examPreviewOpen, setExamPreviewOpen] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState<CourseAssessmentListItem | null>(
    null
  );
  const [activeAssessmentTitle, setActiveAssessmentTitle] = useState("Exam preview");

  const loadCourse = useCallback(async () => {
    if (!id?.trim()) {
      setLoadError("Course id is missing.");
      setCourse(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const { course: data, lectures: apiLectures, studyMaterials: apiMaterials, assessments: apiAssessments } =
        await fetchCourseViewPageData(id);
      setCourse(data);

      const persisted = loadPersistedCurriculum(id);

      let nextLectures = apiLectures;
      if (persisted?.chapters.length) {
        nextLectures = enrichLecturesWithPersistedChapterNames(
          nextLectures,
          persisted.chapters
        );
      }
      if (nextLectures.length === 0 && persisted) {
        nextLectures = persisted.chapters
          .filter((c) => c.lectureSaved)
          .map((c, index) => ({
            id: c.lectureRemoteId ?? c.id,
            chapterTitle: c.name.trim() || `Chapter ${index + 1}`,
            videoPreviewUrl: c.videoPreviewUrl,
          }));
      }
      setLectures(nextLectures);

      let nextMaterials = apiMaterials;
      if (nextMaterials.length === 0 && persisted) {
        nextMaterials = persisted.studyMaterials
          .filter((m) => m.saved)
          .map((m) => ({
            id: m.remoteId ?? m.id,
            title: m.name,
            assetFileId: m.assetFileId,
            viewUrl: m.viewUrl,
          }));
      }
      setStudyMaterials(nextMaterials);
      setAssessments(apiAssessments);
    } catch (err) {
      setLoadError(getCourseCreateErrorMessage(err));
      setCourse(null);
      setLectures([]);
      setStudyMaterials([]);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  const { graduationExam, chapterExams } = partitionCourseAssessments(assessments);

  const openAssessmentPreview = (
    assessment: CourseAssessmentListItem,
    title: string
  ) => {
    setActiveAssessment(assessment);
    setActiveAssessmentTitle(title);
    setExamPreviewOpen(true);
  };

  const coverUrl = course ? resolveCourseCoverSrc(course.coverThumbnail?.path) : undefined;
  const introVideoUrl = course
    ? resolveCourseMediaSrc(course.promotionVideo?.path)
    : undefined;
  const statusLabel = course ? formatCourseListingStatus(course.status) : "—";
  const priceLabel = course
    ? formatCourseListingPrice(course.sellingPrice ?? course.price)
    : "—";
  const createdLabel = course ? formatCourseListingDate(course.createdAt) : "—";
  const updatedLabel = course ? formatCourseListingDate(course.updatedAt) : "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium">Loading course…</p>
      </div>
    );
  }

  if (loadError || !course) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-destructive font-medium max-w-md" role="alert">
          {loadError ?? "Course not found."}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/my-courses")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Courses
          </Button>
          <Button onClick={() => void loadCourse()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 md:px-12 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/my-courses")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold font-heading">Course Overview</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Review Mode
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="outline"
            className="border-2 font-bold"
            onClick={() => window.open("/", "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" /> Live Preview
          </Button>
          <Button
            className="gradient-gold font-bold shadow-lg"
            onClick={() => navigate(`/my-courses/upload?courseId=${course.id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Edit Content
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-24 space-y-12 animate-in fade-in duration-700">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start pt-8">
          <div className="lg:col-span-1">
            <div className="sticky top-32">
              <CourseCoverHero
                coverUrl={coverUrl}
                title={course.title}
                hasIntro={Boolean(introVideoUrl)}
                onPlayIntro={() => introVideoUrl && setViewingVideo(introVideoUrl)}
              />

              <Card className="border-2 shadow-sm bg-muted/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-bold flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Language
                    </span>
                    <Badge variant="secondary" className="font-bold">
                      {course.language}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-bold flex items-center gap-2">
                      <Tag className="h-4 w-4" /> Course ID
                    </span>
                    <span className="font-bold tabular-nums">{course.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-bold flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Updated
                    </span>
                    <span className="font-bold text-sm">{updatedLabel}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="font-bold text-lg text-primary">{priceLabel}</span>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold",
                        courseStatusBadgeClass(course.status)
                      )}
                    >
                      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
                      {statusLabel}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-12">
            <div className="space-y-4">
              <h2 className="text-5xl font-bold font-heading tracking-tight leading-tight">
                {course.title}
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {course.desc?.trim() || "No description provided."}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm font-bold bg-muted px-4 py-2 rounded-xl">
                  <Calendar className="h-4 w-4 text-primary" /> Created: {createdLabel}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <Layers className="h-6 w-6 text-primary" /> Course Curriculum
                </h3>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Preview Enabled
                </span>
              </div>
              {lectures.length > 0 ? (
                <div className="space-y-3">
                  {lectures.map((lecture, index) => {
                    const lectureQuizzes = chapterExams.filter(
                      (a) =>
                        a.courseLectureId != null &&
                        String(a.courseLectureId) === String(lecture.id)
                    );
                    return (
                      <div
                        key={lecture.id}
                        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Chapter {index + 1}
                            </p>
                            <p className="font-bold text-lg truncate">
                              {displayChapterTitle(lecture, index)}
                            </p>
                          </div>
                          {lecture.videoPreviewUrl ? (
                            <Button
                              variant="secondary"
                              className="shrink-0 font-bold"
                              onClick={() => setViewingVideo(lecture.videoPreviewUrl!)}
                            >
                              <Play className="mr-2 h-4 w-4" /> Preview lesson
                            </Button>
                          ) : null}
                        </div>
                        {lectureQuizzes.length > 0 ? (
                          <div className="space-y-2 border-t border-border/60 pt-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Chapter quiz
                            </p>
                            {lectureQuizzes.map((quiz, quizIndex) => (
                              <div
                                key={quiz.id}
                                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">
                                    Quiz
                                    {lectureQuizzes.length > 1 ? ` #${quizIndex + 1}` : ""}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {quiz.questions.length} question
                                    {quiz.questions.length === 1 ? "" : "s"}
                                    {quiz.durationMinutes != null && quiz.durationMinutes > 0
                                      ? ` · ${quiz.durationMinutes} min`
                                      : ""}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0 font-semibold"
                                  onClick={() =>
                                    openAssessmentPreview(
                                      quiz,
                                      `Chapter quiz · ${displayChapterTitle(lecture, index)}`
                                    )
                                  }
                                >
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  Preview
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-10 text-center">
                  <Layers className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="font-bold text-muted-foreground">No chapters yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Lecture chapters will appear here once added in the course builder.
                  </p>
                  <Button
                    className="mt-6 gradient-gold font-bold"
                    onClick={() => navigate(`/my-courses/upload?courseId=${course.id}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Add chapters
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-2 shadow-sm group hover:border-primary/20 transition-all overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <GraduationCap className="h-5 w-5 text-primary" /> Graduation Exam
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {graduationExam ? (
                    <>
                      <p className="text-sm text-balance leading-relaxed text-muted-foreground font-medium">
                        {graduationExam.questions.length} question
                        {graduationExam.questions.length === 1 ? "" : "s"}
                        {graduationExam.durationMinutes != null &&
                        graduationExam.durationMinutes > 0
                          ? ` · ${graduationExam.durationMinutes} min`
                          : ""}
                      </p>
                      <Button
                        variant="secondary"
                        className="w-full font-bold h-11"
                        onClick={() =>
                          openAssessmentPreview(graduationExam, "Graduation Exam")
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" /> Preview Final Exam
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">
                      No graduation exam saved yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 shadow-sm group hover:border-primary/20 transition-all overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <Archive className="h-5 w-5 text-primary" /> Study Materials
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {studyMaterials.length > 0 ? (
                    <ul className="space-y-2">
                      {studyMaterials.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                            <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                            <span className="truncate">{m.title}</span>
                          </span>
                          {m.viewUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 font-bold"
                              onClick={() =>
                                setViewingPdf({ url: m.viewUrl, title: m.title })
                              }
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Open
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">
                        No study materials uploaded yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={!!viewingVideo} onOpenChange={(open) => !open && setViewingVideo(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden border-none bg-black p-0 shadow-2xl [&>button]:right-3 [&>button]:top-3 [&>button]:z-50 [&>button]:h-auto [&>button]:w-auto [&>button]:rounded-full [&>button]:border-0 [&>button]:bg-transparent [&>button]:p-2 [&>button]:text-white [&>button]:opacity-90 [&>button]:shadow-none [&>button]:ring-offset-black [&>button]:hover:bg-white/20 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40 [&>button>svg]:h-6 [&>button>svg]:w-6">
          <div className="flex min-h-[50vh] max-h-[90vh] w-full items-center justify-center p-4">
            {viewingVideo ? (
              <CourseVideoPlayer
                src={viewingVideo}
                autoPlay
                className="max-h-[85vh] max-w-full rounded-lg"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <StudyMaterialPdfDialog
        open={viewingPdf != null}
        onOpenChange={(open) => !open && setViewingPdf(null)}
        source={viewingPdf}
      />

      <CourseAssessmentPreviewDialog
        open={examPreviewOpen}
        onOpenChange={(open) => {
          setExamPreviewOpen(open);
          if (!open) setActiveAssessment(null);
        }}
        assessment={activeAssessment}
        title={activeAssessmentTitle}
      />
    </div>
  );
}
