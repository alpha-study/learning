import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
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
          <main className="flex-1 px-4 py-8 sm:p-6 lg:p-10 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
