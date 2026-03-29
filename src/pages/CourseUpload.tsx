import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Video, 
  Image as ImageIcon, 
  X, 
  Plus, 
  CheckCircle2, 
  Upload, 
  Trash2,
  FileText,
  AlertCircle,
  Info,
  Layers,
  Archive,
  GraduationCap,
  Eye,
  Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Chapter {
  id: string;
  name: string;
  video: File | null;
  videoPreview: string | null;
}

interface StudyMaterial {
  id: string;
  name: string;
  file: File;
}

const STEPS = [
  { id: 1, label: "Basic Info", icon: Info },
  { id: 2, label: "Media Assets", icon: Video },
  { id: 3, label: "Curriculum", icon: Layers },
  { id: 4, label: "Graduation Exam", icon: GraduationCap },
  { id: 5, label: "Study Materials", icon: Archive },
  { id: 6, label: "Review", icon: CheckCircle2 },
];

export default function CourseUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Step Management
  const [currentStep, setCurrentStep] = useState(1);
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const [uploadConfirmOpen, setUploadConfirmOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ type: 'video' | 'image', url: string } | null>(null);
  const [examPreviewOpen, setExamPreviewOpen] = useState(false);

  // Basic Info State (Step 1)
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("English");
  const [price, setPrice] = useState("");
  const [about, setAbout] = useState("");

  // Media State (Step 2)
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [introVideoPreview, setIntroVideoPreview] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Chapters State (Step 3)
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: crypto.randomUUID(), name: "", video: null, videoPreview: null }
  ]);

  // Exam State (Step 4)
  const [finalExamAdded, setFinalExamAdded] = useState(false);

  // Study Materials State (Step 5)
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);

  const introVideoRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const handleMediaUpload = (file: File, type: 'video' | 'image', setFile: (f: File | null) => void, setPreview: (s: string | null) => void) => {
    setFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const removeMedia = (setFile: (f: File | null) => void, setPreview: (s: string | null) => void, preview: string | null) => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const addChapter = () => {
    setChapters([...chapters, { id: crypto.randomUUID(), name: "", video: null, videoPreview: null }]);
  };

  const updateChapter = (id: string, field: string, value: any) => {
    setChapters(chapters.map(ch => {
      if (ch.id === id) {
        if (field === "video") {
          if (value === null) {
            if (ch.videoPreview) URL.revokeObjectURL(ch.videoPreview);
            return { ...ch, video: null, videoPreview: null };
          }
          const url = URL.createObjectURL(value);
          return { ...ch, [field]: value, videoPreview: url };
        }
        return { ...ch, [field]: value };
      }
      return ch;
    }));
  };

  const removeChapter = (id: string) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter(ch => ch.id !== id));
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid File", description: "Only PDF files are allowed.", variant: "destructive" });
        return;
      }
      setStudyMaterials([
        ...studyMaterials,
        { id: crypto.randomUUID(), name: file.name, file }
      ]);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  };

  const removePdf = (id: string) => {
    setStudyMaterials(studyMaterials.filter(m => m.id !== id));
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else setBackConfirmOpen(true);
  };

  const handleNext = () => {
    // Basic Info Verification
    if (currentStep === 1 && (!title || !price || !about)) {
      toast({ title: "Section Incomplete", description: "Please fill all details to proceed.", variant: "destructive" });
      return;
    }
    // Media Verification
    if (currentStep === 2 && (!introVideo || !thumbnail)) {
      toast({ title: "Media Required", description: "Intro video and Thumbnail are mandatory.", variant: "destructive" });
      return;
    }
    // Curriculum Verification
    if (currentStep === 3) {
      const incomplete = chapters.some(ch => !ch.videoPreview || !ch.name);
      if (incomplete) {
        toast({ title: "Videos Required", description: "Every chapter must have a name and a video lecture.", variant: "destructive" });
        return;
      }
    }
    // Exam Verification
    if (currentStep === 4 && !finalExamAdded) {
      toast({ title: "Exam Required", description: "You must add and confirm a Graduation Exam.", variant: "destructive" });
      return;
    }

    if (currentStep < 6) setCurrentStep(currentStep + 1);
    else setUploadConfirmOpen(true);
  };

  const handleUploadCourse = () => {
    setUploadConfirmOpen(false);
    toast({ title: "Success!", description: "Your course has been submitted for review." });
    navigate("/my-courses");
  };

  const renderSidebar = () => (
    <aside className="hidden lg:block w-72 sticky top-24 h-fit space-y-2 pr-8 border-r border-border min-h-[calc(100vh-140px)] animate-in slide-in-from-left-4 duration-500">
      <div className="mb-8 pl-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Course Builder</h3>
      </div>
      {STEPS.map((s) => {
        const Icon = s.icon;
        const isActive = currentStep === s.id;
        const isCompleted = currentStep > s.id;
        return (
          <button
            key={s.id}
            onClick={() => {
              // Basic sequential access enforcement
              if (s.id < currentStep || (s.id === currentStep + 1)) {
                // If attempting to jump forward, simulate Next check
                if (s.id > currentStep) handleNext();
                else setCurrentStep(s.id);
              }
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative",
              isActive ? "bg-primary text-primary-foreground shadow-md" : (isCompleted ? "text-primary hover:bg-primary/5" : "text-muted-foreground hover:bg-muted/50 cursor-not-allowed")
            )}
            disabled={s.id > currentStep + 1}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
              isActive ? "border-primary-foreground" : (isCompleted ? "border-primary bg-primary/10" : "border-muted-foreground/30")
            )}>
              {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className="font-semibold text-sm">{s.label}</span>
            {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-full mr-2"></div>}
          </button>
        );
      })}
    </aside>
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 md:px-12 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setBackConfirmOpen(true)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold font-heading">Course Builder</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{title || "Untitled Course"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <div className="text-[10px] sm:text-xs font-bold text-muted-foreground bg-muted px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border whitespace-nowrap">
            Step {currentStep} / 6
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-32 lg:flex items-start">
        {renderSidebar()}

        <main className="flex-1 lg:pl-12">
          <div className="max-w-3xl animate-in fade-in duration-500">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold font-heading">Basic Information</h2>
                  <p className="text-muted-foreground">Start by detailing the core info of your course.</p>
                </div>
                <Card className="border-2 shadow-none">
                  <CardContent className="pt-8 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-md font-bold">Course Title *</Label>
                      <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Master UX Design from Scratch" className="h-12 text-lg shadow-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-md font-bold">Instruction Language</Label>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-md font-bold">Course Price (INR) *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="h-12 pl-8 shadow-sm" placeholder="1999" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-md font-bold">About this Course *</Label>
                      <Textarea rows={8} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Explain what students will learn, the prerequisites, and the target audience..." className="text-md resize-none shadow-sm" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Media Assets */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold font-heading">Mandatory Media</h2>
                  <p className="text-muted-foreground">Intro video and Thumbnail are required to publish the course.</p>
                </div>
                <div className="grid grid-cols-1 gap-8">
                  <Card className="border-dashed border-2 bg-muted/20 hover:bg-muted/30 transition-colors">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Video className="h-5 w-5 text-primary" /> Promotion Video *</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center py-10">
                      {introVideoPreview ? (
                        <div className="relative w-full aspect-video max-w-xl shadow-2xl rounded-xl overflow-hidden group">
                          <video src={introVideoPreview} controls className="w-full h-full" />
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => removeMedia(setIntroVideo, setIntroVideoPreview, introVideoPreview)}><X className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 cursor-pointer py-10 w-full" onClick={() => introVideoRef.current?.click()}>
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Upload className="h-8 w-8 text-primary" /></div>
                          <div className="text-center">
                            <span className="text-lg font-bold block text-primary">Upload Intro Video Required</span>
                            <span className="text-sm text-muted-foreground">MP4 or MOV, max 500MB</span>
                          </div>
                          <input type="file" hidden ref={introVideoRef} accept="video/*" onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'video', setIntroVideo, setIntroVideoPreview)} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="border-dashed border-2 bg-muted/20 hover:bg-muted/30 transition-colors">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Cover Thumbnail *</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center py-10">
                      {thumbnailPreview ? (
                        <div className="relative w-full aspect-video max-w-xl shadow-2xl rounded-xl overflow-hidden group">
                          <img src={thumbnailPreview} className="w-full h-full object-cover" alt="thumbnail" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <Button variant="secondary" size="sm" onClick={() => setViewingMedia({ type: 'image', url: thumbnailPreview })}>View Full</Button>
                            <Button variant="destructive" size="sm" onClick={() => removeMedia(setThumbnail, setThumbnailPreview, thumbnailPreview)}>Remove</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 cursor-pointer py-10 w-full" onClick={() => thumbnailRef.current?.click()}>
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><ImageIcon className="h-8 w-8 text-primary" /></div>
                          <div className="text-center">
                            <span className="text-lg font-bold block text-primary">Upload Thumbnail Required</span>
                            <span className="text-sm text-muted-foreground">PNG, JPG or WebP, 1280x720 recommended</span>
                          </div>
                          <input type="file" hidden ref={thumbnailRef} accept="image/*" onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'image', setThumbnail, setThumbnailPreview)} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 3: Curriculum */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold font-heading">Course Curriculum</h2>
                  <p className="text-muted-foreground">Every chapter must have a name and a lecture video to proceed.</p>
                </div>
                <div className="space-y-12">
                  {chapters.map((ch, idx) => (
                    <div key={ch.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-6 sm:pb-4 gap-4">
                        <div className="flex items-start sm:items-center gap-4 w-full">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-lg mt-1 sm:mt-0">{idx + 1}</div>
                          <div className="space-y-1 flex-1">
                             <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Chapter Name</Label>
                             <Input 
                                className="text-lg sm:text-xl font-bold border-none p-0 h-auto focus-visible:ring-0 bg-transparent w-full" 
                                placeholder="e.g. Introduction to React Basics" 
                                value={ch.name} 
                                onChange={(e) => updateChapter(ch.id, 'name', e.target.value)} 
                             />
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full self-end sm:self-center" onClick={() => removeChapter(ch.id)}><X className="h-5 w-5" /></Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Lecture Video Area (Styled like Step 2) */}
                        <Card className={cn(
                          "border-dashed border-2 transition-all overflow-hidden",
                          ch.videoPreview ? "bg-muted/10 border-primary/20" : "bg-muted/20 hover:bg-muted/50 border-primary/40 animate-pulse"
                        )}>
                           <CardHeader className="py-4 border-b bg-muted/30">
                              <CardTitle className="text-md flex items-center gap-2 font-bold tracking-tight">
                                <Video className="h-4 w-4 text-primary" /> Lecture Video Content *
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="flex flex-col items-center justify-center p-0 min-h-[220px]">
                              {ch.videoPreview ? (
                                <div className="relative w-full aspect-video group">
                                  <video src={ch.videoPreview} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <Button variant="secondary" size="sm" onClick={() => setViewingMedia({ type: 'video', url: ch.videoPreview! })}>
                                      <Play className="h-4 w-4 mr-2" /> View
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => updateChapter(ch.id, 'video', null)}>
                                      <Trash2 className="h-4 w-4 mr-2" /> Remove
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-4 cursor-pointer py-10 w-full" onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'video/*';
                                  input.onchange = (e: any) => e.target.files?.[0] && updateChapter(ch.id, 'video', e.target.files[0]);
                                  input.click();
                                }}>
                                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><Upload className="h-6 w-6 text-primary" /></div>
                                  <div className="text-center">
                                    <span className="text-sm font-bold block text-primary tracking-tight">Add Lecture Video</span>
                                    <span className="text-xs text-muted-foreground">MP4, MOV supported</span>
                                  </div>
                                </div>
                              )}
                           </CardContent>
                        </Card>

                        {/* Chapter Quiz Area */}
                        <div className="space-y-4">
                           <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Assessment (Optional)</Label>
                           <Button 
                              variant="outline" 
                              className="w-full h-[220px] border-dashed border-2 flex flex-col gap-4 hover:bg-primary/5 hover:border-primary transition-all group/q rounded-xl"
                              onClick={() => window.open("/add-exam", "_blank")}
                            >
                              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center group-hover/q:scale-110 transition-transform"><FileText className="h-8 w-8 text-primary" /></div>
                              <div className="text-center">
                                <span className="text-md font-bold block">Create Chapter Quiz</span>
                                <span className="text-xs text-muted-foreground">Test student knowledge for this chapter</span>
                              </div>
                            </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full h-16 border-dashed border-2 rounded-xl text-lg font-bold group mt-8" onClick={addChapter}>
                  <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" /> 
                  Add New Chapter to Course
                </Button>
              </div>
            )}

            {/* Step 4: Graduation Exam */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold font-heading">Graduation Exam</h2>
                  <p className="text-muted-foreground">Every course must have a final assessment to award certificates.</p>
                </div>
                <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
                   <div className="bg-primary/5 p-8 flex flex-col items-center gap-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-lg">
                      <GraduationCap className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-bold">Graduation Assessment</h3>
                       <p className="text-muted-foreground max-w-sm">Designing a comprehensive exam helps students validate their learning and earn credits.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                       <Button 
                        className="h-14 px-8 text-lg font-bold gradient-gold shadow-lg flex-1 sm:max-w-[240px]" 
                        onClick={() => window.open("/add-exam", "_blank")}
                      >
                        <Plus className="mr-2 h-5 w-5" /> Open Creator
                      </Button>
                      <Button 
                        variant="outline"
                        className="h-14 px-8 text-lg font-bold border-2 flex-1 sm:max-w-[200px]" 
                        onClick={() => {
                          if (!finalExamAdded) {
                            toast({ title: "Action Required", description: "Please confirm you've added the exam first.", variant: "destructive" });
                          } else {
                             setExamPreviewOpen(true);
                          }
                        }}
                      >
                        <Eye className="mr-2 h-5 w-5" /> Preview Exam
                      </Button>
                    </div>
                   </div>
                   <CardContent className="pt-8 pb-8 flex items-center justify-center border-t">
                      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-primary/10">
                        <Label htmlFor="exam-confirm" className="font-bold cursor-pointer">I have added and synchronized the graduation exam</Label>
                        <Switch id="exam-confirm" checked={finalExamAdded} onCheckedChange={setFinalExamAdded} />
                      </div>
                   </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Study Materials */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold font-heading">Study Materials (Optional)</h2>
                  <p className="text-muted-foreground">Upload supplementary PDF notes, resources, or assignments.</p>
                </div>
                <Card className="border-dashed border-2 py-16 flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-primary/5 hover:border-primary transition-all" onClick={() => pdfRef.current?.click()}>
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-lg">
                    <FileText className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">Click to upload PDFs</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">Upload e-books, slide decks, or extra reading materials for your students.</p>
                  </div>
                  <input type="file" hidden ref={pdfRef} accept="application/pdf" onChange={handlePdfUpload} />
                </Card>

                {studyMaterials.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Archive className="h-5 w-5 text-primary" /> Uploaded Resources ({studyMaterials.length})</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {studyMaterials.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border group hover:border-primary/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg"><FileText className="h-5 w-5 text-primary" /></div>
                            <span className="text-sm font-bold truncate max-w-[250px]">{m.name}</span>
                          </div>
                          <div className="flex gap-2">
                             <Button variant="outline" size="sm" onClick={() => window.open(URL.createObjectURL(m.file))}>View</Button>
                             <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => removePdf(m.id)}>Remove</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-3 py-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary animate-pulse">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-4xl font-bold font-heading">Course Ready!</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">You've successfully built your course. Review the summary before publishing.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="border-2 shadow-xl">
                    <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-lg font-bold">Quick Summary</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center border-b pb-3 border-border/50">
                        <span className="text-muted-foreground font-medium">Topic</span>
                        <span className="font-bold text-right max-w-[180px] truncate">{title}</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-3 border-border/50">
                        <span className="text-muted-foreground font-medium">Curriculum</span>
                        <span className="font-bold">{chapters.length} Chapters</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-3 border-border/50">
                        <span className="text-muted-foreground font-medium">Graduation Exam</span>
                        <span className="font-bold text-primary flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Added</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">Pricing</span>
                        <span className="font-bold text-primary text-xl">₹{price}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start p-6 bg-primary/5 rounded-2xl border border-primary/20 gap-4 shadow-sm">
                      <AlertCircle className="h-8 w-8 text-primary shrink-0 mt-1" />
                      <div className="space-y-2">
                        <h4 className="font-bold">Next Steps</h4>
                        <p className="text-sm text-balance leading-relaxed">By clicking <strong>Submit</strong>, your content will enter our review pipeline. Our education team will verify the video quality and graduation exam within 48 hours.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border p-4 sm:p-6 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <Button variant="outline" className="w-full sm:w-[150px] h-12 sm:h-14 font-semibold order-2 sm:order-1" onClick={handleBack}>
            {currentStep === 1 ? "Cancel" : "Back Step"}
          </Button>
          <Button className="w-full sm:w-[250px] h-12 sm:h-14 text-md sm:text-lg font-bold gradient-gold shadow-lg order-1 sm:order-2" onClick={handleNext}>
            {currentStep === 6 ? "Submit & Publish" : "Continue to Next"}
          </Button>
        </div>
      </div>

      <Dialog open={!!viewingMedia} onOpenChange={(open) => !open && setViewingMedia(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none shadow-2xl">
          <Button variant="ghost" size="icon" className="absolute right-3 top-3 z-50 text-white hover:bg-white/20 rounded-full" onClick={() => setViewingMedia(null)}>
            <X className="h-6 w-6" />
          </Button>
          <div className="flex items-center justify-center min-h-[50vh] max-h-[90vh]">
            {viewingMedia?.type === 'video' ? (
              <video src={viewingMedia.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
            ) : (
              <img src={viewingMedia?.url} className="max-w-full max-h-[85vh] object-contain" alt="Preview" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exam Preview Dialog */}
      <Dialog open={examPreviewOpen} onOpenChange={setExamPreviewOpen}>
        <DialogContent className="max-w-2xl bg-background rounded-2xl">
           <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Eye className="h-6 w-6 text-primary" /> Graduation Exam Preview
              </DialogTitle>
              <DialogDescription>
                This is how the final assessment will appear to your students.
              </DialogDescription>
           </DialogHeader>
           <div className="py-6 space-y-6">
              <div className="p-6 bg-muted rounded-xl space-y-4">
                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Question 1 of 10</span>
                  <div className="flex gap-2 items-center">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">Multi-select</span>
                    <span>Time Left: 20:00</span>
                  </div>
                </div>
                <h4 className="text-lg font-bold leading-tight">Which of the following are core principles of modern web accessibility (WCAG)?</h4>
                <div className="grid grid-cols-1 gap-3">
                   {[
                     { label: "Perceivable", correct: true },
                     { label: "Operable", correct: true },
                     { label: "Fast Loading", correct: false },
                     { label: "Robust", correct: true }
                   ].map((opt, i) => (
                     <div key={i} className={cn(
                       "p-4 border-2 rounded-lg bg-background flex items-center gap-3 transition-colors shadow-sm",
                       opt.correct ? "border-green-600 bg-green-50/50" : "hover:border-primary cursor-pointer"
                     )}>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                          opt.correct ? "bg-green-600 border-green-600 text-white" : ""
                        )}>{String.fromCharCode(65 + i)}</div>
                        <span className="font-medium flex-1">{opt.label}</span>
                        {opt.correct && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                     </div>
                   ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                 <Button variant="outline" disabled>Previous Question</Button>
                 <Button className="gradient-gold font-bold">Next Question</Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={backConfirmOpen} onOpenChange={setBackConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Discard draft?</AlertDialogTitle>
            <AlertDialogDescription className="text-md">
              You are about to exit the course builder. Any current progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Keep Editing</AlertDialogCancel>
            <AlertDialogAction className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => navigate("/my-courses")}>Discard Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={uploadConfirmOpen} onOpenChange={setUploadConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
             <AlertDialogTitle className="text-2xl font-bold">Publish your course?</AlertDialogTitle>
             <AlertDialogDescription className="text-md">
               Once submitted, your course will move to the 'In Review' status.
             </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-2">Wait, Review Again</AlertDialogCancel>
            <AlertDialogAction className="h-12 gradient-gold text-primary-foreground font-bold" onClick={handleUploadCourse}>Confirm & Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
