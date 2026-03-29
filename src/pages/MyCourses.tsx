import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Edit, Trash2, Upload, Search, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type CourseDetails = {
  id: number;
  title: string;
  author: string;
  genre: string;
  status: string;
  date: string;
  buyers: number; // Added Total Buyers count
  coverUrl?: string;
};

const initialCourses: CourseDetails[] = [
  { id: 1, title: "Full-Stack Web Development", author: "Dr. Angela Yu", genre: "Technology", status: "Published", date: "2025-12-01", buyers: 1250, coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=120&auto=format&fit=crop" },
  { id: 2, title: "UI/UX Design Masterclass", author: "Gary Simon", genre: "Design", status: "Draft", date: "2025-11-15", buyers: 0, coverUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=120&auto=format&fit=crop" },
  { id: 3, title: "Digital Marketing 101", author: "Neil Patel", genre: "Marketing", status: "Published", date: "2025-10-20", buyers: 840, coverUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=120&auto=format&fit=crop" },
  { id: 4, title: "Data Science with Python", author: "Kirill Eremenko", genre: "Technology", status: "Review", date: "2025-09-05", buyers: 0, coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=120&auto=format&fit=crop" },
  { id: 5, title: "Business Strategy", author: "Seth Godin", genre: "Business", status: "Published", date: "2025-08-18", buyers: 2100, coverUrl: "https://images.unsplash.com/photo-1614165936126-2ed18e471b3b?q=80&w=120&auto=format&fit=crop" },
];

const statusColor: Record<string, string> = {
  Published: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
  Draft: "bg-muted text-muted-foreground border border-border",
  Review: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
};

export default function MyCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseDetails[]>(initialCourses);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("25");

  const [deletingCourse, setDeletingCourse] = useState<CourseDetails | null>(null);
  const [deleteWord, setDeleteWord] = useState("");

  const handleDelete = () => {
    if (deletingCourse && deleteWord === "DELETE") {
      setCourses(prev => prev.filter(b => b.id !== deletingCourse.id));
      setDeletingCourse(null);
      setDeleteWord("");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCourses.length / parseInt(itemsPerPage));
  const startIndex = (currentPage - 1) * parseInt(itemsPerPage);
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + parseInt(itemsPerPage));

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
            Upload
          </Button>
          <Badge variant="secondary" className="text-sm">{filteredCourses.length} courses</Badge>
        </div>
      </div>

      <Card className="bg-card overflow-hidden border-2 shadow-sm">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Title</th>
                  <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Instructor</th>
                  <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Category</th>
                  <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Total Buyer</th>
                  <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                  <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Date</th>
                  <th className="text-center p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      No courses found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  paginatedCourses.map((course) => (
                    <tr key={course.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-20 shrink-0 aspect-video overflow-hidden rounded-lg border border-border shadow-sm bg-muted">
                            <img
                              src={course.coverUrl}
                              alt={course.title}
                              className="h-full w-full object-cover transition-transform hover:scale-105"
                            />
                          </div>
                          <span className="font-bold text-md tracking-tight leading-tight">{course.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground font-medium">{course.author}</td>
                      <td className="p-4 text-muted-foreground">{course.genre}</td>
                      <td className="p-4">
                         <div className="flex items-center gap-2 font-bold">
                            <Users className="h-4 w-4 text-primary" />
                            {course.buyers.toLocaleString()}
                         </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor[course.status]}`}>{course.status}</span>
                      </td>
                      <td className="p-4 text-muted-foreground font-medium">{course.date}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 border-2 hover:bg-primary/5" onClick={() => navigate(`/my-courses/view/${course.id}`)} title="View Details">
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 border-2 hover:bg-primary/5" onClick={() => navigate("/my-courses/upload")} title="Edit Course">
                            <Edit className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 border-2 hover:bg-destructive/5 text-destructive border-border" onClick={() => setDeletingCourse(course)} title="Delete Course">
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

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-border">
            {filteredCourses.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground italic">
                No matching courses found.
              </div>
            ) : (
              paginatedCourses.map((course) => (
                <div key={course.id} className="p-6 space-y-6 active:bg-muted/50 transition-colors">
                  <div className="flex gap-4">
                    <div className="w-24 h-16 shrink-0 aspect-video overflow-hidden rounded-xl border border-border shadow-md bg-muted">
                      <img
                        src={course.coverUrl}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-extrabold text-lg leading-tight tracking-tight">{course.title}</h3>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{course.author}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Enrollments</p>
                      <div className="flex items-center gap-2 font-extrabold text-primary">
                        <Users className="h-4 w-4" />
                        {course.buyers.toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${statusColor[course.status]}`}>
                        {course.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Created On</p>
                      <p className="text-xs font-bold">{course.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-10 w-10 border-2 rounded-xl" onClick={() => navigate(`/my-courses/view/${course.id}`)}>
                        <Eye className="h-5 w-5 text-primary" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-10 w-10 border-2 rounded-xl" onClick={() => navigate("/my-courses/upload")}>
                        <Edit className="h-5 w-5 text-primary" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-10 w-10 border-2 rounded-xl text-destructive border-border" onClick={() => setDeletingCourse(course)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Rows per page</span>
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="w-[70px] h-9 border-2">
                <SelectValue placeholder="25" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            Showing {filteredCourses.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + parseInt(itemsPerPage), filteredCourses.length)} of {filteredCourses.length} entries
          </span>
        </div>
        
        {totalPages > 1 && (
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer border-2"}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer border-2"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCourse} onOpenChange={(open) => {
        if (!open) { setDeletingCourse(null); setDeleteWord(""); }
      }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Are you absolutely sure?</DialogTitle>
            <DialogDescription className="pt-2 text-md leading-relaxed">
              This action cannot be undone. This will permanently delete 
              <span className="font-bold text-foreground mx-1">"{deletingCourse?.title}"</span> 
              and remove all associated media from our global servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
                Please type <span className="font-bold text-destructive select-all">DELETE</span> to confirm.
              </Label>
              <Input
                value={deleteWord}
                onChange={(e) => setDeleteWord(e.target.value)}
                placeholder="DELETE"
                className="h-12 border-2 text-center font-bold tracking-[0.2em]"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="h-12 border-2" onClick={() => { setDeletingCourse(null); setDeleteWord(""); }}>Cancel</Button>
            <Button variant="destructive" className="h-12 font-bold" disabled={deleteWord !== "DELETE"} onClick={handleDelete}>
              Confirm Permanent Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
