import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Edit, Trash2, Upload, Search, Users, Loader2, BookOpen } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  deleteCourse,
  extractDeleteCourseMessage,
  fetchCourseListing,
  formatCourseListingDate,
  formatCourseListingPrice,
  courseStatusBadgeClass,
  formatCourseListingStatus,
  getCourseCreateErrorMessage,
  resolveCourseCoverSrc,
  type CourseListingRow,
} from "@/lib/api/course";

type CourseListDisplay = {
  id: number;
  title: string;
  language: string;
  priceLabel: string;
  status: string;
  statusCode?: number;
  date: string;
  buyers: number;
  coverUrl?: string;
};

function mapListingRow(row: CourseListingRow): CourseListDisplay {
  return {
    id: row.id,
    title: row.title,
    language: row.language,
    priceLabel: formatCourseListingPrice(row.sellingPrice ?? row.price),
    status: formatCourseListingStatus(row.status),
    statusCode: row.status,
    date: formatCourseListingDate(row.createdAt),
    buyers: row.purchaseCount ?? 0,
    coverUrl: resolveCourseCoverSrc(row.coverThumbnail?.path),
  };
}

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

function CourseCover({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}
      >
        <BookOpen className="h-6 w-6 opacity-50" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function MyCourses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseListDisplay[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("10");

  const [editingCourse, setEditingCourse] = useState<CourseListDisplay | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<CourseListDisplay | null>(null);
  const [deleteWord, setDeleteWord] = useState("");
  const [deleteFinalConfirmOpen, setDeleteFinalConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const resetDeleteFlow = () => {
    setDeletingCourse(null);
    setDeleteWord("");
    setDeleteError(null);
    setDeleteFinalConfirmOpen(false);
  };

  const pageSize = parseInt(itemsPerPage, 10);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const offset = (currentPage - 1) * pageSize;
      const data = await fetchCourseListing({ offset, limit: pageSize });
      setCourses((data.rows ?? []).map(mapListingRow));
      setTotalCount(data.count ?? 0);
    } catch (err) {
      setLoadError(getCourseCreateErrorMessage(err));
      setCourses([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const confirmEditCourse = () => {
    if (!editingCourse) return;
    navigate(`/my-courses/upload?courseId=${editingCourse.id}`);
    setEditingCourse(null);
  };

  const requestDeleteFinalConfirm = () => {
    if (!deletingCourse || deleteWord !== "DELETE" || deleteSubmitting) return;
    setDeleteError(null);
    setDeleteFinalConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCourse || deleteWord !== "DELETE" || deleteSubmitting) return;

    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await deleteCourse(deletingCourse.id);
      const message =
        extractDeleteCourseMessage(res) ?? "Course deleted successfully";
      toast({ title: message });
      resetDeleteFlow();

      const remainingOnPage = courses.length - 1;
      if (remainingOnPage === 0 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        await loadCourses();
      }
    } catch (err) {
      setDeleteError(getCourseCreateErrorMessage(err));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(q) ||
        course.language.toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-2xl font-bold">My Courses</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses..."
              className="w-full pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="gradient-gold text-primary-foreground font-semibold"
            onClick={() => navigate("/my-courses/upload")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Create course
          </Button>
        </div>
      </div>

      {loadError && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {loadError}
          <Button
            type="button"
            variant="link"
            className="ml-2 h-auto p-0 text-destructive underline"
            onClick={() => void loadCourses()}
          >
            Retry
          </Button>
        </div>
      )}

      <Card className="bg-card overflow-hidden border-2 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              <span className="text-sm font-medium">Loading courses…</span>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                        Title
                      </th>
                      <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                        Language
                      </th>
                      <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                        Price
                      </th>
                      <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                        Total Buyer
                      </th>
                      <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                        Status
                      </th>
                      <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                        Date
                      </th>
                      <th className="text-center p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-muted-foreground">
                          {searchQuery.trim()
                            ? `No courses on this page match "${searchQuery}"`
                            : "No courses yet. Upload your first course to get started."}
                        </td>
                      </tr>
                    ) : (
                      filteredCourses.map((course) => (
                        <tr
                          key={course.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-20 shrink-0 aspect-video overflow-hidden rounded-lg border border-border shadow-sm bg-muted">
                                <CourseCover
                                  src={course.coverUrl}
                                  alt={course.title}
                                  className="h-full w-full object-cover transition-transform hover:scale-105"
                                />
                              </div>
                              <span className="font-bold text-md tracking-tight leading-tight">
                                {course.title}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground font-medium">
                            {course.language}
                          </td>
                          <td className="p-4 text-muted-foreground font-medium">
                            {course.priceLabel}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 font-bold">
                              <Users className="h-4 w-4 text-primary" />
                              {course.buyers.toLocaleString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${courseStatusBadgeClass(course.statusCode)}`}
                            >
                              {course.status}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground font-medium">
                            {course.date}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 border-2 hover:bg-primary/5"
                                onClick={() => navigate(`/my-courses/view/${course.id}`)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 border-2 hover:bg-primary/5"
                                onClick={() => setEditingCourse(course)}
                                title="Edit Course"
                              >
                                <Edit className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 border-2 hover:bg-destructive/5 text-destructive border-border"
                                onClick={() => setDeletingCourse(course)}
                                title="Delete Course"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-border">
                {filteredCourses.length === 0 ? (
                  <div className="text-center p-12 text-muted-foreground italic">
                    {searchQuery.trim()
                      ? "No matching courses on this page."
                      : "No courses yet."}
                  </div>
                ) : (
                  filteredCourses.map((course) => (
                    <div
                      key={course.id}
                      className="p-6 space-y-6 active:bg-muted/50 transition-colors"
                    >
                      <div className="flex gap-4">
                        <div className="w-24 h-16 shrink-0 aspect-video overflow-hidden rounded-xl border border-border shadow-md bg-muted">
                          <CourseCover
                            src={course.coverUrl}
                            alt={course.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-extrabold text-lg leading-tight tracking-tight">
                            {course.title}
                          </h3>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            {course.language}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Enrollments
                          </p>
                          <div className="flex items-center gap-2 font-extrabold text-primary">
                            <Users className="h-4 w-4" />
                            {course.buyers.toLocaleString()}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Status
                          </p>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${courseStatusBadgeClass(course.statusCode)}`}
                          >
                            {course.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Created On
                          </p>
                          <p className="text-xs font-bold">{course.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-2 rounded-xl"
                            onClick={() => navigate(`/my-courses/view/${course.id}`)}
                          >
                            <Eye className="h-5 w-5 text-primary" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-2 rounded-xl"
                            onClick={() => setEditingCourse(course)}
                          >
                            <Edit className="h-5 w-5 text-primary" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-2 rounded-xl text-destructive border-border"
                            onClick={() => setDeletingCourse(course)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Rows per page
            </span>
            <SearchableSelect
              options={PAGE_SIZE_OPTIONS}
              value={itemsPerPage}
              onValueChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
              placeholder="10"
              searchPlaceholder="Search…"
              triggerClassName="h-9 w-[70px] border-2 shrink-0 px-2"
              minDropdownWidth={120}
            />
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            {totalCount === 0
              ? "No entries"
              : `Showing ${startIndex} to ${endIndex} of ${totalCount} entries`}
          </span>
        </div>

        {totalPages > 1 && !loading && (
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer border-2"
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i + 1}>
                  <PaginationLink
                    onClick={() => setCurrentPage(i + 1)}
                    isActive={currentPage === i + 1}
                    className="cursor-pointer border-2"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer border-2"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <AlertDialog
        open={!!editingCourse}
        onOpenChange={(open) => {
          if (!open) setEditingCourse(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Edit course?</AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              You&apos;ll open the course editor for{" "}
              <span className="font-bold text-foreground">
                &quot;{editingCourse?.title}&quot;
              </span>
              . You can update each section and save your changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 min-w-[10rem] gradient-gold font-bold text-primary-foreground"
              onClick={confirmEditCourse}
            >
              Open editor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!deletingCourse && !deleteFinalConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !deleteSubmitting) {
            resetDeleteFlow();
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Are you absolutely sure?</DialogTitle>
            <DialogDescription className="pt-2 text-md leading-relaxed">
              This action cannot be undone. This will permanently delete
              <span className="font-bold text-foreground mx-1">
                &quot;{deletingCourse?.title}&quot;
              </span>
              and remove all associated media from our global servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
                Please type <span className="font-bold text-destructive select-all">DELETE</span>{" "}
                to confirm.
              </Label>
              <Input
                value={deleteWord}
                onChange={(e) => setDeleteWord(e.target.value.toUpperCase())}
                placeholder="DELETE"
                className="h-12 border-2 text-center font-bold tracking-[0.2em]"
                disabled={deleteSubmitting}
              />
            </div>
            {deleteError && (
              <p className="text-sm text-destructive font-medium" role="alert">
                {deleteError}
              </p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              className="h-12 border-2"
              disabled={deleteSubmitting}
              onClick={resetDeleteFlow}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-12 font-bold"
              disabled={deleteWord !== "DELETE" || deleteSubmitting}
              onClick={requestDeleteFinalConfirm}
            >
              Confirm Permanent Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteFinalConfirmOpen && !!deletingCourse}
        onOpenChange={(open) => {
          if (!open && !deleteSubmitting) {
            setDeleteFinalConfirmOpen(false);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">
              What happens for students?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  You are about to permanently delete{" "}
                  <span className="font-bold text-foreground">
                    &quot;{deletingCourse?.title}&quot;
                  </span>
                  .
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    The course will be removed from your catalog and will no longer be
                    available to new students.
                  </li>
                  <li>
                    Students who have not purchased will lose access to this course.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">
                      Students who already bought this course will still be able to view
                      it
                    </span>{" "}
                    in their library.
                  </li>
                </ul>
                <p className="text-xs">
                  This cannot be undone. Associated media will be removed from our
                  servers according to platform policy.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive font-medium" role="alert">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter className="mt-2 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-12 border-2" disabled={deleteSubmitting}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSubmitting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleteSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Deleting…
                </>
              ) : (
                "Delete course permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
