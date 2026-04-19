import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isMockAuthenticated, MOCK_AUTH_EVENT } from "@/lib/mock-auth";

export function DashboardLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = () => {
      if (isMockAuthenticated()) {
        setReady(true);
      } else {
        setReady(false);
        navigate("/");
      }
    };
    check();
    window.addEventListener(MOCK_AUTH_EVENT, check);
    return () => window.removeEventListener(MOCK_AUTH_EVENT, check);
  }, [navigate]);

  if (!ready) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-4">
               <SidebarTrigger className="-ml-2" />
               <h1 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Command Center</h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 px-4 py-8 sm:p-6 lg:p-10 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
