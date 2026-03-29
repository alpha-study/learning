import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "./components/ThemeProvider";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import MyCourses from "./pages/MyCourses";
import SettingsPage from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import CourseUpload from "./pages/CourseUpload";
import AddExam from "./pages/AddExam";
import CourseDetails from "./pages/CourseDetails";
import { DashboardLayout } from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="learning-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-courses" element={<MyCourses />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="/my-courses/upload" element={<CourseUpload />} />
            <Route path="/my-courses/view/:id" element={<CourseDetails />} />
            <Route path="/add-exam" element={<AddExam />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
