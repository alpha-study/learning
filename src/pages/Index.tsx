import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, BarChart3, Upload, Shield } from "lucide-react";
import heroImage from "@/assets/hero-books.jpg";

const features = [
  { icon: BookOpen, title: "Publish with Ease", description: "Upload and manage your entire book catalog from one intuitive dashboard." },
  { icon: BarChart3, title: "Sales Analytics", description: "Track performance with beautiful charts and real-time metrics." },
  { icon: Upload, title: "Bulk Uploads", description: "Upload multiple books at once with our streamlined workflow." },
  { icon: Shield, title: "Secure & Reliable", description: "Your manuscripts and data are protected with enterprise-grade security." },
];

export default function Index() {
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/dashboard");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-border/50">
        <h1 className="font-heading text-2xl font-bold text-foreground">BookVault</h1>
        <Button className="gradient-gold text-primary-foreground font-semibold px-6" onClick={() => setAuthOpen(true)}>
          Sign In
        </Button>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 md:px-12 py-20 md:py-32 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h2 className="font-heading text-4xl md:text-6xl font-bold leading-tight text-foreground">
              Your Books,{" "}
              <span className="text-gradient-gold">Beautifully Published</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              The modern publishing platform for authors and publishers. Manage, track, and grow your book catalog with powerful tools and elegant analytics.
            </p>
            <div className="flex gap-4 pt-2">
              <Button size="lg" className="gradient-gold text-primary-foreground font-semibold px-8" onClick={() => setAuthOpen(true)}>
                Get Started
              </Button>
              <Button size="lg" variant="outline" className="border-border text-foreground">
                Learn More
              </Button>
            </div>
          </div>
          <div className="flex-1">
            <img src={heroImage} alt="Stack of beautifully bound books" width={1280} height={720} className="rounded-2xl shadow-2xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card py-20">
        <div className="container mx-auto px-6 md:px-12">
          <h3 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14">Everything You Need</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-background rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg gradient-gold flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h4 className="font-heading text-lg font-semibold mb-2">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} BookVault. All rights reserved.
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
