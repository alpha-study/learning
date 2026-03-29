import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Users, TrendingUp, ShieldCheck, ArrowRight, BookMarked, Smartphone, CheckCircle2, Building2 } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import logoImage from "@/assets/logo.png";

export default function Index() {
  const [authOpen, setAuthOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const [contactForm, setContactForm] = useState({
    name: "",
    publicationName: "",
    email: "",
    phone: "",
    catalogSize: "",
    message: ""
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.publicationName) {
      toast({
        title: "Missing fields",
        description: "Please fill in your name, email, and publication name.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Request submitted successfully!",
      description: "Our partnership team will contact you within 24 hours.",
    });
    setContactForm({ name: "", publicationName: "", email: "", phone: "", catalogSize: "", message: "" });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30">
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
          <img src={logoImage} alt="alpha logo" className="h-8 md:h-10 w-auto object-contain" />
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <button onClick={() => scrollToSection('features')} className="hover:text-foreground transition-colors">Features</button>
          <button onClick={() => scrollToSection('products')} className="hover:text-foreground transition-colors">Products</button>
          <button onClick={() => scrollToSection('about')} className="hover:text-foreground transition-colors">About Alpha</button>
        </div>
        <div className="flex bg-transparent items-center gap-4">
          <Button variant="ghost" className="hidden sm:flex font-semibold" onClick={() => setAuthOpen(true)}>Login</Button>
          <Button className="gradient-gold text-primary-foreground font-semibold px-6 shadow-md hover:shadow-lg transition-all" onClick={() => scrollToSection('contact')}>
            Partner with us
          </Button>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative px-6 md:px-12 py-20 md:py-32 flex flex-col items-center text-center overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>

          <div className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-medium text-muted-foreground mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            Now open for global publications
          </div>

          <h1 className="max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Publish directly to the <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">Alpha Generation.</span>
          </h1>

          <p className="max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
            Bridge the gap between your educational content and the millions of students, teachers, and institutes actively using the Alpha Social & Digital Education Platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button size="lg" className="gradient-gold text-primary-foreground font-semibold px-8 h-14 text-lg w-full sm:w-auto group" onClick={() => setAuthOpen(true)}>
              Start Publishing
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto border-2" onClick={() => scrollToSection('contact')}>
              Talk to Sales
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-6 md:px-12 py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Alpha is best for Publishers</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Zero distribution friction. Direct audience engagement. Unmatched security for your intellectual property.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Users, title: "Direct Audience Access", desc: "Instantly reach millions of students preparing for exams or seeking career guidance on our app." },
                { icon: TrendingUp, title: "Zero Distribution Friction", desc: "Upload PDFs or EPUBs, set pricing, and publish instantly without printing or shipping costs." },
                { icon: ShieldCheck, title: "Ironclad Security", desc: "Protect your IP. Our encrypted reading environments ensure your books cannot be pirated or downloaded." },
                { icon: BookOpen, title: "Real-Time Analytics", desc: "Track reads, engagement, and sales performance through your dedicated publication dashboard." },
              ].map((feature, i) => (
                <div key={i} className="bg-background rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Products Section */}
        <section id="products" className="px-6 md:px-12 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 space-y-8">
                <h2 className="text-3xl md:text-5xl font-bold leading-tight">A unified ecosystem for modern education.</h2>
                <p className="text-lg text-muted-foreground">
                  Your publications seamlessly bridge the gap between creation and consumption. Upload via the Dashboard, and let students engage via the Mobile App.
                </p>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="mt-1 h-10 w-10 shrink-0 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                      <BookMarked className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold mb-1">Publication Dashboard (For You)</h4>
                      <p className="text-muted-foreground">Manage your entire catalog, track lifetime sales, engage with institutional buyers, and control your digital rights all from one powerful web interface.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="mt-1 h-10 w-10 shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold mb-1">Alpha: Education</h4>
                      <p className="text-muted-foreground">A platform connecting students and educators for communication, mentorship, courses, books, and career growth.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="mt-1 h-10 w-10 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold mb-1">Alpha: Workspace</h4>
                      <p className="text-muted-foreground">A comprehensive cloud-based academic management workspace for admissions, communication, campus operations, online meetings, and cloud storage.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/2 w-full">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-gradient-to-br from-muted to-background p-8 aspect-square flex items-center justify-center">
                  {/* Abstract Representation of the Ecosystem */}
                  <div className="relative w-full max-w-md aspect-video bg-background rounded-lg border border-border shadow-lg z-10 p-4 transform -rotate-6 lg:-rotate-6 hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                      <div className="h-3 w-3 rounded-full bg-red-400"></div>
                      <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                      <div className="h-3 w-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-1/3 bg-muted rounded"></div>
                      <div className="h-20 w-full bg-gradient-to-r from-primary/20 to-gold/20 rounded"></div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="h-10 bg-muted rounded"></div>
                        <div className="h-10 bg-muted rounded"></div>
                        <div className="h-10 bg-muted rounded"></div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-10 bottom-10 w-32 h-64 bg-background rounded-[2rem] border-4 border-muted-foreground/20 shadow-2xl z-20 p-2 transform rotate-12 hover:rotate-6 transition-transform duration-500 flex flex-col items-center">
                    <div className="h-4 w-16 bg-muted rounded-full mt-2 mb-4"></div>
                    <div className="w-full h-full bg-gradient-to-b from-blue-500/20 to-background rounded-xl border border-border"></div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-gold/10 pointer-events-none"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Alpha Context */}
        <section id="about" className="px-6 md:px-12 py-32 bg-primary text-primary-foreground text-center relative overflow-hidden">
          {/* Abstract background elements */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">What is Alpha?</h2>
            <p className="text-lg md:text-2xl text-primary-foreground/90 leading-relaxed mb-6">
              Alpha is a comprehensive social and digital education platform designed for schools, colleges, teachers, and students. We provide a dynamic space for students to enhance their careers, manage institutional activities, connect globally, and access vital educational resources.
            </p>
            <p className="text-lg md:text-xl text-primary-foreground/90 font-medium">
              We empower institutions to establish a strong presence in today's competitive market. At Alpha, we believe in empowering everyone – because you are Alpha!
            </p>
          </div>
        </section>

        {/* Publisher Contact Form */}
        <section id="contact" className="px-6 md:px-12 py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="max-w-5xl mx-auto bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden flex flex-col md:flex-row relative z-10">
            <div className="md:w-5/12 bg-gradient-to-br from-primary to-blue-900 p-10 text-white flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-bold mb-4">Become an Alpha Publisher</h3>
                <p className="text-white/80 leading-relaxed mb-8">
                  Expand your readership to the exact demographic looking for your books. Fill out the form and our onboarding team will set up your verified publisher account.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-gold" />
                    <span>Free account setup</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-gold" />
                    <span>Revenue-share model</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-gold" />
                    <span>Dedicated account manager</span>
                  </div>
                </div>
              </div>
              <div className="mt-12 text-sm text-white/60">
                Prefer email? Reach us directly at <br />
                <a href="mailto:support@alpha.study" className="text-white hover:underline font-medium">support@alpha.study</a>
              </div>
            </div>

            <div className="md:w-7/12 p-10 bg-card">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" required placeholder="John Doe" value={contactForm.name} onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pubName">Publication Name *</Label>
                    <Input id="pubName" required placeholder="Acme Educational Books" value={contactForm.publicationName} onChange={e => setContactForm(prev => ({ ...prev, publicationName: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Work Email *</Label>
                    <Input id="email" type="email" required placeholder="john@acmebooks.com" value={contactForm.email} onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={contactForm.phone} onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="catalog">Estimated Catalog Size</Label>
                  <Input id="catalog" placeholder="e.g. 50-100 books" value={contactForm.catalogSize} onChange={e => setContactForm(prev => ({ ...prev, catalogSize: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea id="message" placeholder="Tell us about the subjects or categories you publish..." rows={4} value={contactForm.message} onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))} />
                </div>

                <Button type="submit" className="w-full gradient-gold text-primary-foreground font-bold h-12 text-lg">
                  Submit Partnership Request
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted px-6 md:px-12 py-12 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <img src={logoImage} alt="alpha logo" className="h-8 w-auto grayscale opacity-70 mb-4 hover:grayscale-0 transition-all cursor-pointer" onClick={() => window.scrollTo(0, 0)} />
            <p className="text-muted-foreground text-sm">Empowering education globally.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="https://play.google.com/store/apps/details?id=com.softwill.alpha" target="_blank" rel="noreferrer" className="hover:text-foreground">Alpha For Students</a>
            <a href="https://www.alpha.study" target="_blank" rel="noreferrer" className="hover:text-foreground">Alpha For Institutes</a>
            <a href="https://www.alpha.study" target="_blank" rel="noreferrer" className="hover:text-foreground">Terms & Conditions</a>
            <a href="https://www.youtube.com/@alpha_study" target="_blank" rel="noreferrer" className="hover:text-foreground">Get Help on YouTube</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Uneto. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
