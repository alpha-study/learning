import { createBrowserRouter, RouterProvider } from "react-router-dom";
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

const router = createBrowserRouter([
  { path: "/", element: <Index /> },
  { path: "/reset-password", element: <ResetPassword /> },
  {
    element: <DashboardLayout />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/my-courses", element: <MyCourses /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  { path: "/my-courses/upload", element: <CourseUpload /> },
  { path: "/my-courses/view/:id", element: <CourseDetails /> },
  { path: "/add-exam", element: <AddExam /> },
  { path: "*", element: <NotFound /> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="learning-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
