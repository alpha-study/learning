import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Video, 
  Plus, 
  CheckCircle2, 
  FileText,
  Info,
  Layers,
  Archive,
  GraduationCap,
  Eye,
  Play,
  Users,
  Calendar,
  Tag,
  Edit,
  ExternalLink,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Mock data lookup - in a real app this would fetch based on id
const MOCK_COURSES: Record<string, any> = {
  "1": {
    id: 1,
    title: "Full-Stack Web Development",
    author: "Dr. Angela Yu",
    genre: "Technology",
    status: "Published",
    date: "2025-12-01",
    buyers: 1250,
    ratings: "4.8 (1,230 Ratings)",
    price: "4999",
    about: "This comprehensive course covers everything from HTML/CSS to advanced React and Node.js. Learn to build production-ready applications with hands-on projects.",
    coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop",
    introVideoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
    chapters: [
      { id: "c1", name: "Introduction to the Web", videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4", hasQuiz: false },
      { id: "c2", name: "Mastering React Hooks", videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4", hasQuiz: true },
      { id: "c3", name: "Backend with Node & Express", videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4", hasQuiz: true }
    ],
    materials: [
      { id: "m1", name: "Modern-JS-CheatSheet.pdf", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
      { id: "m2", name: "Project-Requirements.pdf", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
    ]
  }
};

export default function CourseDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const course = MOCK_COURSES[id || "1"] || MOCK_COURSES["1"];
  
  const [viewingVideo, setViewingVideo] = useState<string | null>(null);
  const [examPreviewOpen, setExamPreviewOpen] = useState(false);
  const [activeQuizTitle, setActiveQuizTitle] = useState<string | null>(null);

  const openQuizPreview = (chapterName: string) => {
    setActiveQuizTitle(`Quiz: ${chapterName}`);
    setExamPreviewOpen(true);
  };

  const openFinalExam = () => {
    setActiveQuizTitle("Graduation Exam");
    setExamPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 md:px-12 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/my-courses")} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold font-heading">Course Overview</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Review Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" className="border-2 font-bold" onClick={() => window.open("/", "_blank")}>
            <ExternalLink className="mr-2 h-4 w-4" /> Live Preview
          </Button>
          <Button className="gradient-gold font-bold shadow-lg" onClick={() => navigate("/my-courses/upload")}>
            <Edit className="mr-2 h-4 w-4" /> Edit Content
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-24 space-y-12 animate-in fade-in duration-700">
        {/* Header Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start pt-8">
           <div className="lg:col-span-1">
              <div className="sticky top-32">
                 {/* Unified Banner Video Section */}
                 <div 
                    className="relative group aspect-[16/10] rounded-2xl overflow-hidden border-4 border-white shadow-2xl mb-6 cursor-pointer bg-black"
                    onClick={() => setViewingVideo(course.introVideoUrl)}
                 >
                    <img src={course.coverUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" alt="Course Cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xl">
                          <Play className="h-10 w-10 text-white fill-white ml-1" />
                       </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                       <span className="bg-primary px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">Watch Intro Video</span>
                    </div>
                 </div>

                 <Card className="border-2 shadow-sm bg-muted/30">
                    <CardContent className="p-6 space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-bold flex items-center gap-2"><Tag className="h-4 w-4" /> Category</span>
                          <Badge variant="secondary" className="font-bold">{course.genre}</Badge>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-bold flex items-center gap-2"><Users className="h-4 w-4" /> Total Buyers</span>
                          <span className="font-bold tabular-nums">{course.buyers.toLocaleString()}</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-bold flex items-center gap-2"><Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Ratings</span>
                          <span className="font-bold">{course.ratings}</span>
                       </div>
                       <div className="flex items-center justify-between border-t pt-4">
                          <span className="font-bold text-lg text-primary">₹{course.price}</span>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                             <CheckCircle2 className="h-3 w-3" /> {course.status}
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              </div>
           </div>

           <div className="lg:col-span-2 space-y-12">
              <div className="space-y-4">
                 <h2 className="text-5xl font-bold font-heading tracking-tight leading-tight">{course.title}</h2>
                 <p className="text-xl text-muted-foreground leading-relaxed">{course.about}</p>
                 <div className="flex items-center gap-6 pt-4">
                    <div className="flex items-center gap-2 text-sm font-bold bg-muted px-4 py-2 rounded-xl">
                       <Calendar className="h-4 w-4 text-primary" /> Created: {course.date}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold bg-muted px-4 py-2 rounded-xl">
                       <Layers className="h-4 w-4 text-primary" /> {course.chapters.length} Chapters
                    </div>
                 </div>
              </div>

              {/* Curriculum Section */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-2xl font-bold flex items-center gap-3"><Layers className="h-6 w-6 text-primary" /> Course Curriculum</h3>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preview Enabled</span>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    {course.chapters.map((ch: any, i: number) => (
                      <div key={ch.id} className="group p-6 bg-muted/30 rounded-2xl border-2 border-transparent hover:border-primary/20 hover:bg-white transition-all shadow-sm">
                         <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{i + 1}</div>
                               <div className="space-y-1">
                                  <p className="font-bold font-heading text-xl">{ch.name}</p>
                                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 leading-none">
                                     <Video className="h-3 w-3" /> Video Lecture • Interactive
                                  </p>
                               </div>
                            </div>
                            <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity border-2 font-bold h-9 bg-background" onClick={() => setViewingVideo(ch.videoUrl)}>
                               <Play className="h-4 w-4 mr-2" /> Play Demo
                            </Button>
                         </div>
                         
                         {/* Enhanced Chapter Quiz Preview */}
                         {ch.hasQuiz && (
                            <div className="mt-4 ml-14 p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between animate-in slide-in-from-left-2 duration-300">
                               <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-bold">Chapter MCQ Assessment</span>
                               </div>
                               <Button variant="link" size="sm" className="text-primary font-bold h-7 p-0 hover:no-underline" onClick={() => openQuizPreview(ch.name)}>
                                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview Quiz
                               </Button>
                            </div>
                         )}
                      </div>
                    ))}
                 </div>
              </div>

              {/* Exam & Materials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <Card className="border-2 shadow-sm group hover:border-primary/20 transition-all overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-4">
                       <CardTitle className="text-lg flex items-center gap-2 font-bold"><GraduationCap className="h-5 w-5 text-primary" /> Graduation Exam</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                       <p className="text-sm text-balance leading-relaxed text-muted-foreground font-medium">Standard 10-question assessment linked to final certification eligibility.</p>
                       <Button variant="secondary" className="w-full font-bold h-11" onClick={openFinalExam}>
                          <Eye className="mr-2 h-4 w-4" /> Preview Final Exam
                       </Button>
                    </CardContent>
                 </Card>

                 <Card className="border-2 shadow-sm group hover:border-primary/20 transition-all overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-4">
                       <CardTitle className="text-lg flex items-center gap-2 font-bold"><Archive className="h-5 w-5 text-primary" /> Study Materials</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                       <div className="space-y-3">
                          {course.materials.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border-2 border-transparent hover:border-primary/20 transition-all text-sm font-bold">
                               <div className="flex items-center gap-3 truncate max-w-[200px]">
                                  <FileText className="h-5 w-5 text-primary shrink-0" />
                                  <span className="truncate">{m.name}</span>
                               </div>
                               <Button variant="ghost" size="sm" className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/5 border border-primary/10 shadow-sm" onClick={() => window.open(m.url, "_blank")}>
                                  View PDF
                               </Button>
                            </div>
                          ))}
                       </div>
                    </CardContent>
                 </Card>
              </div>
           </div>
        </section>
      </div>

      {/* Video Modal */}
      <Dialog open={!!viewingVideo} onOpenChange={(open) => !open && setViewingVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none shadow-2xl">
          <Button variant="ghost" size="icon" className="absolute right-3 top-3 z-50 text-white hover:bg-white/20 rounded-full" onClick={() => setViewingVideo(null)}>
             <X className="h-6 w-6" />
          </Button>
          <div className="flex items-center justify-center min-h-[50vh] max-h-[90vh]">
            <video src={viewingVideo || ""} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Exam Preview Modal */}
      <Dialog open={examPreviewOpen} onOpenChange={setExamPreviewOpen}>
        <DialogContent className="max-w-2xl bg-background rounded-2xl">
           <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" /> {activeQuizTitle}
              </DialogTitle>
              <DialogDescription>
                Synchronized with Chapter content. Final preview for instructors.
              </DialogDescription>
           </DialogHeader>
           <div className="py-6 space-y-6">
              <div className="p-6 bg-muted rounded-xl space-y-4 shadow-inner">
                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Preview Item</span>
                  <div className="flex gap-3 items-center">
                    <span className="bg-primary/10 text-primary px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider">Multi-select</span>
                    <span>2 Points</span>
                  </div>
                </div>
                <h4 className="text-xl font-bold leading-tight">Identify the correct principles of the provided curriculum:</h4>
                <div className="grid grid-cols-1 gap-3">
                   {[
                     { label: "State Synchronization", correct: true },
                     { label: "Asynchronous HOCs", correct: true },
                     { label: "Native DOM Access", correct: false },
                     { label: "Wrapper Logging", correct: true }
                   ].map((opt, i) => (
                     <div key={i} className={cn(
                       "p-4 border-2 rounded-xl bg-background flex items-center gap-3 transition-colors shadow-sm",
                       opt.correct ? "border-green-600 bg-green-50/50" : ""
                     )}>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                          opt.correct ? "bg-green-600 border-green-600 text-white" : ""
                        )}>{String.fromCharCode(65 + i)}</div>
                        <span className="font-bold flex-1 tracking-tight">{opt.label}</span>
                        {opt.correct && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                     </div>
                   ))}
                </div>
              </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function X({ className, ...props }: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide lucide-x", className)}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
