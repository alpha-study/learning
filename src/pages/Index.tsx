import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isMockAuthenticated, MOCK_AUTH_EVENT } from "@/lib/mock-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Video,
  Users,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  BookMarked,
  Smartphone,
  CheckCircle2,
  GraduationCap,
  Layers,
  Globe,
  Zap,
  Award,
  Sparkles,
  Command,
  Layout,
  MessageSquare
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import logoImage from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Index() {
  const [authOpen, setAuthOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    const goDashboardIfMock = () => {
      if (isMockAuthenticated()) navigate("/dashboard");
    };
    goDashboardIfMock();
    window.addEventListener(MOCK_AUTH_EVENT, goDashboardIfMock);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener(MOCK_AUTH_EVENT, goDashboardIfMock);
    };
  }, [navigate]);

  const [contactForm, setContactForm] = useState({
    name: "",
    institutionName: "",
    email: "",
    phone: "",
    expertise: "",
    message: ""
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.institutionName) {
      toast({
        title: "Missing fields",
        description: "Please fill in your name, email, and institution name.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Request submitted successfully!",
      description: "Our instructor onboarding team will contact you within 24 hours.",
    });
    setContactForm({ name: "", institutionName: "", email: "", phone: "", expertise: "", message: "" });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 overflow-x-hidden">
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />

      {/* Global Mesh Gradient Background - Theme Aware */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Dark Mode Mesh */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 dark:bg-primary/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-50 dark:opacity-40" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-pink-600/10 dark:bg-pink-600/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 opacity-30 dark:opacity-20" />

        {/* Light mode specific soft accents */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] opacity-20 dark:hidden" />

        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_rgba(0,0,0,0.05)_1px,_transparent_0)] dark:bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.03)_1px,_transparent_0)] bg-[size:40px_40px]" />
      </div>

      {/* Modern Floating Navbar */}
      <nav className={cn(
        "fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl transition-all duration-300 rounded-2xl border border-border px-6 py-3 flex items-center justify-between",
        isScrolled ? "bg-background/60 backdrop-blur-xl shadow-2xl py-3" : "bg-transparent py-5"
      )}>
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src={logoImage} alt="logo" className={cn("h-8 md:h-10 w-auto transition-transform group-hover:scale-105", "dark:brightness-0 dark:invert")} />
        </div>


        <div className="flex items-center gap-3 md:gap-4">
          <ThemeToggle />
          <Button variant="ghost" className="hidden sm:flex font-bold text-muted-foreground hover:text-foreground" onClick={() => setAuthOpen(true)}>Login</Button>
          <Button className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 text-white font-bold px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all h-11" onClick={() => scrollToSection('contact')}>
            Start Teaching
          </Button>
        </div>
      </nav>

      <main>
        {/* Massive Hero Section */}
        <section className="relative min-h-[95vh] flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 sm:block hidden">
            <div className="mesh-blob w-[500px] h-[500px] bg-primary/10 dark:bg-primary/20 absolute top-0 -left-20 blur-[100px] rounded-full animate-pulse" />
            <div className="mesh-blob w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-500/20 absolute bottom-0 -right-20 blur-[100px] rounded-full animate-bounce duration-[8s]" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 backdrop-blur-md mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="h-4 w-4 text-primary dark:text-primary/80" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary dark:text-primary/20">The Future of Education</span>
          </div>

          <h1 className="max-w-6xl text-5xl sm:text-7xl lg:text-9xl font-extrabold font-heading tracking-tight leading-[0.95] mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 italic">
            Your courses. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-indigo-500 dark:from-primary dark:via-blue-400 dark:to-indigo-400 drop-shadow-sm font-extrabold">Yes, it is.</span>
          </h1>

          <p className="max-w-2xl text-lg md:text-2xl text-muted-foreground mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            A powerful platform built for instructors to launch courses, manage students, track performance, and grow their teaching business effortlessly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 w-full sm:w-auto px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Button size="lg" className="bg-primary hover:primary/90 text-primary-foreground font-bold h-14 md:h-16 px-6 md:px-10 text-lg md:text-xl rounded-2xl shadow-2xl shadow-primary/30 group transition-all" onClick={() => setAuthOpen(true)}>
              Launch Dashboard
              <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6 group-hover:translate-x-2 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 md:h-16 px-6 md:px-10 text-lg md:text-xl font-bold rounded-2xl border-border bg-card/50 backdrop-blur-sm hover:bg-muted transition-all" onClick={() => scrollToSection('contact')}>
              Talk to Onboarding
            </Button>
          </div>

          {/* Social Proof Bar */}
          <div className="mt-32 w-full max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-12 border-t border-border/50 dark:border-white/5 pt-16 animate-in fade-in duration-1000 delay-500">
            {[
              { label: "Active Learners", value: "2200+" },
              { label: "Expert Instructors", value: "10+" },
              { label: "Course Categories", value: "20+" },
              { label: "Global Presence", value: "India" }
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <p className="text-4xl md:text-5xl font-extrabold font-heading mb-1 text-foreground group-hover:text-primary transition-colors tracking-tight">{stat.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Matrix - Detailed Grid */}
        <section id="features" className="px-6 md:px-12 py-40 relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-24 space-y-4">
              <h2 className="text-4xl md:text-7xl font-extrabold font-heading tracking-tight leading-none uppercase italic text-foreground">The Expert Toolset</h2>
              <div className="flex items-center gap-4">
                <div className="h-1 flex-1 bg-gradient-to-r from-primary/50 dark:from-primary/30 to-transparent rounded-full" />
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary dark:text-primary/80 whitespace-nowrap">Everything you need to compete</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Course Management", desc: "Drag-and-drCreate and organize your courses with ease. Upload videos, PDFs, quizzes, and more — all in a structured curriculum.", color: "indigo" },
                { icon: ShieldCheck, title: "DRM Protection", desc: "Forensic watermarking and encrypted streaming to stop piracy before it starts.", color: "violet" },
                { icon: Layout, title: "Analytics Dashboard", desc: "BGet actionable insights into enrollments, completion rates, and revenue growth.", color: "pink" },
                { icon: MessageSquare, title: "Secure & Reliable", desc: "Your content is सुरक्षित with enterprise-grade security and hosting.", color: "indigo" },
                { icon: Globe, title: "Revenue & Payments", desc: "Monetize your courses your way with seamless payment integrations and transparent earnings tracking.", color: "violet" },
                { icon: Award, title: "Marketing Tools", desc: "Launch promotions, coupons, and email campaigns to grow your audience.", color: "pink" },
              ].map((f, i) => (
                <div key={i} className="group relative p-8 rounded-[2.5rem] bg-card border border-border/50 hover:border-primary/50 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer shadow-sm hover:shadow-xl">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-lg",
                    f.color === "indigo" ? "bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary/80" :
                      f.color === "violet" ? "bg-blue-600/10 dark:bg-blue-600/30 text-blue-600 dark:text-blue-400" :
                        "bg-blue-400/10 dark:bg-blue-400/30 text-blue-400 dark:text-blue-200"
                  )}>
                    <f.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold font-heading mb-4 tracking-tight text-foreground">{f.title}</h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ecosystem Section - Unified Flow */}
        <section id="ecosystem" className="px-6 md:px-12 py-40 bg-muted/20 dark:bg-slate-100/5 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-24">
              <div className="lg:w-1/2 space-y-12">
                <div className="space-y-6">
                  <h2 className="text-4xl md:text-8xl font-extrabold font-heading tracking-tight leading-none italic uppercase text-foreground">One Hub. <br /> Total Control.</h2>
                  <p className="text-xl text-muted-foreground font-medium leading-relaxed">
                    Unified workflows for modern educators. Connect your creation process directly to the learner's hand.
                  </p>
                </div>

                <div className="space-y-8">
                  {[
                    { title: "Educators", desc: "Web-based dashboard for production, analytics, and management.", icon: Command },
                    { title: "Education App", desc: "iOS/Android destination for high-fidelity course consumption.", icon: Smartphone },
                    { title: "Academic Workspace", desc: "Greater opportunities to sell courses under the institution’s brand.", icon: Layers },
                  ].map((p, i) => (
                    <div key={i} className="flex gap-6 group">
                      <div className="mt-1 h-14 w-14 shrink-0 rounded-2xl bg-card border border-border flex items-center justify-center text-primary group-hover:text-pink-600 transition-all shadow-sm group-hover:shadow-md">
                        <p.icon className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-2xl font-bold tracking-tight text-foreground">{p.title}</h4>
                        <p className="text-muted-foreground font-medium">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:w-1/2 w-full perspective-[2000px]">
                <div className="relative group transition-all duration-700 hover:rotate-y-6 hover:scale-105">
                  <div className="relative aspect-square md:aspect-video bg-gradient-to-br from-primary/10 dark:from-primary/20 to-blue-600/10 dark:to-blue-600/20 rounded-[4rem] border-4 border-border dark:border-white/10 p-12 backdrop-blur-xl flex items-center justify-center">
                    <div className="relative w-full h-full bg-card rounded-3xl border border-border dark:border-white/20 shadow-[-40px_40px_100px_rgba(0,0,0,0.1)] dark:shadow-[-40px_40px_100px_rgba(0,0,0,0.5)] p-6 overflow-hidden">
                      <div className="h-6 w-32 bg-primary/20 rounded-full mb-8" />
                      <div className="grid grid-cols-4 gap-4 mb-8">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-2xl" />)}
                      </div>
                      <div className="h-40 w-full bg-gradient-to-r from-primary/10 to-blue-600/10 dark:from-primary/40 dark:to-blue-600/40 rounded-3xl" />

                      {/* Mobile Overlay */}
                      <div className="absolute right-8 bottom-[-40px] w-40 h-[280px] bg-sky-950 dark:bg-slate-950 rounded-[2.5rem] border-[6px] border-slate-200 dark:border-slate-800 shadow-2xl p-3">
                        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" />
                        <div className="w-full aspect-[4/5] bg-primary/10 rounded-2xl border border-primary/10" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Mission Section */}
        <section id="about" className="px-6 md:px-12 py-40 relative text-center">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="text-4xl md:text-9xl font-extrabold font-heading tracking-tight leading-none italic uppercase text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/5 drop-shadow-sm">Our Mission.</h2>
            <p className="text-xl md:text-3xl text-primary font-medium leading-relaxed italic">
              "Expertise should have no boundaries. We democratize the infrastructure of elite knowledge transfer for a global audience."
            </p>
            <div className="pt-10 flex flex-col items-center">
              <div className="h-20 w-[2px] bg-gradient-to-b from-primary to-transparent mb-6" />
              <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-muted-foreground uppercase tracking-widest leading-none">The Learning Foundation</p>
            </div>
          </div>
        </section>

        {/* Instructor Onboarding Portal (Form) */}
        <section id="contact" className="px-6 md:px-12 py-32 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl px-6 h-full pointer-events-none opacity-5 dark:opacity-20">
            <div className="w-full h-full border-[100px] border-foreground/5 dark:border-white/5 rounded-full" />
          </div>

          <div className="max-w-6xl mx-auto bg-card/60 dark:bg-slate-900/50 backdrop-blur-3xl rounded-[4rem] border border-border dark:border-white/10 shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10 transition-transform duration-500 hover:scale-[1.01]">
            <div className="lg:w-5/12 bg-gradient-to-br from-primary via-blue-700 to-indigo-950 p-16 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-5xl font-extrabold font-heading mb-8 tracking-tight leading-none uppercase italic">Join the <br /> Vanguard.</h3>
                <p className="text-lg text-indigo-100/90 leading-relaxed mb-10 font-medium">
                  Onboarding industry-leading experts, certified academics, and master creators to the platform.
                </p>
                <div className="space-y-6">
                  {[
                    "Verified Instructor Status",
                    "Dedicated Revenue Manager",
                    "Global Marketing Support",
                    "Course Production Assistance"
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-4 text-[10px] font-bold">
                      <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="uppercase tracking-[0.2em]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-20 relative z-10 bg-black/20 p-6 rounded-2xl backdrop-blur-md border border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-2">Access Portal Channel</p>
                <a href="mailto:support@alpha.study" className="text-xl font-bold hover:text-pink-300 transition-colors">support@alpha.study</a>
              </div>

              <div className="absolute -right-40 -bottom-40 w-96 h-96 bg-white/5 rounded-full" />
            </div>

            <div className="lg:w-7/12 p-16">
              <form onSubmit={handleContactSubmit} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Legal Name*</Label>
                    <Input id="name" required placeholder="Dr. Jane Smith" className="h-14 bg-muted/50 border-border focus:ring-primary/20 text-foreground" value={contactForm.name} onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="instName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Institution Name*</Label>
                    <Input id="instName" required placeholder="Academy Partners" className="h-14 bg-muted/50 border-border focus:ring-primary/20 text-foreground" value={contactForm.institutionName} onChange={e => setContactForm(prev => ({ ...prev, institutionName: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Official Email*</Label>
                    <Input id="email" type="email" required placeholder="jane@institute.org" className="h-14 bg-muted/50 border-border focus:ring-primary/20 text-foreground" value={contactForm.email} onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" className="h-14 bg-muted/50 border-border focus:ring-primary/20 text-foreground" value={contactForm.phone} onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="expertise" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Field</Label>
                  <Input id="expertise" placeholder="e.g. Computer Science, Fine Arts, Digital Business" className="h-14 bg-muted/50 border-border focus:ring-primary/20 text-foreground" value={contactForm.expertise} onChange={e => setContactForm(prev => ({ ...prev, expertise: e.target.value }))} />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="message" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Portfolio Summary</Label>
                  <Textarea id="message" placeholder="Brief details about your teaching history or publication background..." rows={4} className="bg-muted/50 border-border focus:ring-primary/20 text-foreground resize-none" value={contactForm.message} onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))} />
                </div>

                <Button type="submit" className="w-full bg-primary hover:primary/90 text-primary-foreground font-black h-16 text-xl rounded-2xl shadow-xl shadow-primary/20 group transition-all uppercase tracking-widest italic">
                  Apply for Verification
                  <Zap className="ml-2 h-6 w-6 fill-primary-foreground" />
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Detailed Global Footer */}
      <footer className="bg-slate-950 px-6 md:px-12 py-32 border-t border-white/5 relative overflow-hidden text-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
            <div className="space-y-8">
              <img src={logoImage} alt="logo" className="h-10 w-auto brightness-0 invert" />
              <p className="text-slate-400 font-medium leading-relaxed">
                Alpha is a professional social networking platform designed for educational networking, career development, access to online courses and eBooks, and facilitating academic collaboration.
              </p>
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-primary transition-all cursor-pointer"><Globe className="h-4 w-4" /></div>
                <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-primary transition-all cursor-pointer"><MessageSquare className="h-4 w-4" /></div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Quick Links</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold text-slate-400">
                <li><a href="https://www.alpha.study" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Visit Alpha</a></li>
                <li><a href="https://www.uneto.co" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Uneto Solutions Pvt Ltd</a></li>
                <li><a href="https://play.google.com/store/apps/details?id=com.softwill.alpha" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Download mobile app</a></li>
                <li><a href="https://www.instagram.com/alpha_edu_official" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="https://in.linkedin.com/company/uneto" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIN</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-500">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} Uneto Solutions Pvt Ltd. Alpha Ecosystem.
            </p>
            <div className="flex gap-1 items-center">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Global Status: Optimal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
