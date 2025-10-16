import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import TrueOrFalse from "./components/sandbox/TrueOrFalse";
import MultipleChoices from "./components/sandbox/MultipleChoices";
import { ChatProvider } from "./contexts/ChatContext";

const queryClient = new QueryClient();

// Component to handle role-based routing logic
const AppRoutes = () => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes - accessible without login */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />

      {/* Protected routes based on role - only for logged in users */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute allowedRoles={["superadmin"]}>
            <SuperAdmin />
          </ProtectedRoute>
        }
      />

      {/* Sandbox routes (public for now) */}
      <Route path="/sandbox" element={<MultipleChoices />} />

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ChatProvider>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <UserProvider>
              <AppRoutes />
            </UserProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ChatProvider>
  </QueryClientProvider>
);

export default App;
