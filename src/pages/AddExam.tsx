import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswers: number[];
}

export default function AddExam() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [examTitle, setExamTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { id: crypto.randomUUID(), text: "", options: ["", "", "", ""], correctAnswers: [0] }
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: crypto.randomUUID(), text: "", options: ["", "", "", ""], correctAnswers: [0] }
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: string, field: string, value: any) => {
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
          if (q.correctAnswers.length === 1) {
            toast({ title: "Validation Error", description: "At least one answer must be correct.", variant: "destructive" });
            return q;
          }
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

  const handleSave = () => {
    if (!examTitle.trim()) {
      toast({ title: "Title required", description: "Please enter an exam title.", variant: "destructive" });
      return;
    }
    toast({ title: "Exam Saved!", description: "Your multi-answer MCQ assessment has been created successfully." });
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 md:px-12 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold font-heading">Exam Creator</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Step 4 Core Component</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden sm:flex text-[10px] font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border uppercase tracking-widest">
            {questions.length} Question Units
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-32 space-y-10 animate-in fade-in duration-700">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold font-heading tracking-tight leading-none uppercase italic text-foreground">Final Assessment.</h2>
          <p className="text-muted-foreground font-medium text-lg leading-relaxed">Define clear graduation criteria with multi-answer support.</p>
        </div>

        <Card className="border-2 shadow-sm bg-card overflow-hidden rounded-[2.5rem]">
          <div className="h-2 bg-gradient-to-r from-primary via-blue-500 to-indigo-600" />
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Zap className="h-4 w-4 text-primary" /> Exam Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-title" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Exam Title *</Label>
                <Input 
                  id="exam-title" 
                  placeholder="e.g., Module 4: Advanced Systems Design" 
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="h-14 text-lg font-bold bg-muted/30 focus-visible:ring-primary/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8 pb-12">
          {questions.map((q, qIdx) => (
            <Card key={q.id} className="relative overflow-hidden group border-2 hover:border-primary/30 transition-all shadow-md bg-card rounded-[2.5rem]">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-indigo-600"></div>
              <CardHeader className="pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b bg-muted/10 gap-4">
                <CardTitle className="text-sm font-extrabold uppercase tracking-[0.2em] text-primary">Question Unit {qIdx + 1}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive h-9 w-9 hover:bg-destructive/10 rounded-full md:absolute md:top-4 md:right-4"
                  onClick={() => removeQuestion(q.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-8 pt-8">
                <div className="space-y-3">
                  <Label className="font-black uppercase text-[10px] tracking-[0.3em] text-muted-foreground">Question Prompt</Label>
                  <Input 
                    placeholder="Enter your question here..." 
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                    className="h-14 font-bold text-lg border-2 focus-visible:ring-primary/20"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = q.correctAnswers.includes(optIdx);
                    return (
                      <div key={optIdx} className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Option {optIdx + 1}</Label>
                          <button 
                            className={cn(
                              "text-[9px] uppercase font-black tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-all w-full sm:w-auto justify-center",
                              isCorrect 
                                ? "bg-green-600 dark:bg-green-500 text-white border-green-600 dark:border-green-500 shadow-lg shadow-green-500/20" 
                                : "text-muted-foreground hover:text-foreground border-border bg-muted/50"
                            )}
                            onClick={() => toggleCorrectAnswer(q.id, optIdx)}
                          >
                            <CheckCircle2 className={cn("h-3 w-3", isCorrect ? "fill-white" : "")} />
                            {isCorrect ? "Validated Answer" : "Mark as Correct"}
                          </button>
                        </div>
                        <Input 
                          placeholder={`Option ${optIdx + 1} distribution...`} 
                          value={opt}
                          onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                          className={cn(
                            "h-12 font-bold transition-all border-2",
                            isCorrect 
                              ? "border-green-500 bg-green-500/5 dark:bg-green-500/10 ring-2 ring-green-200/50" 
                              : "bg-background border-border"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border p-6 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Button variant="outline" className="flex-1 h-14 sm:h-16 text-md sm:text-lg font-black uppercase tracking-widest border-2 rounded-2xl group hover:bg-muted" onClick={addQuestion}>
              <Plus className="mr-3 h-6 w-6 transition-transform group-hover:rotate-90" />
              Add Unit
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 text-white font-extrabold h-14 sm:h-16 text-md sm:text-lg shadow-2xl shadow-primary/20 rounded-2xl border-none hover:scale-[1.02] transition-transform uppercase tracking-wider italic" onClick={handleSave}>
              Finalize & Synchronize
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
