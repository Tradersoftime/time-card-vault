import Receipt from "./pages/Receipt";
import AdminQR from "./pages/AdminQR";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import CardRedirect from "./pages/CardRedirect";
import ClaimCard from "./pages/ClaimCard";
import MyCards from "./pages/MyCards";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminLogs from "./pages/AdminLogs";
import ResetPassword from "./pages/ResetPassword";
import Scan from "./pages/Scan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background text-foreground dark">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/r/:code" element={<CardRedirect />} />
                <Route path="/claim" element={<ClaimCard />} />
                <Route path="/me/cards" element={<MyCards />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/auth/admin" element={<AdminLogin />} />
                <Route path="/auth/reset" element={<ResetPassword />} />
                <Route path="/scan" element={<Scan />} />
                <Route path="/admin/qr" element={<AdminQR />} />
                <Route path="/receipt/:id" element={<Receipt />} />
                <Route path="/admin/logs" element={<AdminLogs />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Footer />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
