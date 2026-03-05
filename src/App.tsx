import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePin } from "@/hooks/usePin";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { IncomingCallOverlay, ActiveCallOverlay } from "@/components/call/CallOverlays";
import { PinSetup } from "@/components/PinSetup";
import ChatsPage from "@/pages/ChatsPage";
import VideoCallPage from "@/pages/VideoCallPage";
import CallsPage from "@/pages/CallsPage";
import SettingsPage from "@/pages/SettingsPage";
import StoriesPage from "@/pages/StoriesPage";
import AccountPage from "@/pages/AccountPage";
import AuthPage from "@/pages/AuthPage";
import LandingPage from "@/pages/LandingPage";
import NotFound from "./pages/NotFound";
import InstallPage from "@/pages/InstallPage";
import AIChatPage from "@/pages/AIChatPage";

const queryClient = new QueryClient();

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const { hasPin, loading: pinLoading, savePin } = usePin();
  useOnlineStatus();

  if (loading || pinLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/welcome" replace />;
  }

  if (!hasPin) {
    return <PinSetup onComplete={savePin} />;
  }

  return (
    <CallProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-hidden flex pb-14 md:pb-0">
          <Routes>
            <Route path="/" element={<ChatsPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/video" element={<VideoCallPage />} />
            <Route path="/calls" element={<CallsPage />} />
            <Route path="/ai" element={<AIChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <MobileBottomNav />
        <IncomingCallOverlay />
        <ActiveCallOverlay />
      </div>
    </CallProvider>
  );
}

function AuthGuard() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Don't redirect if there's a verification token in the URL
  const hasToken = window.location.hash?.includes("access_token");

  if (session && !hasToken) {
    return <Navigate to="/" replace />;
  }

  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TranslationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/welcome" element={<LandingPage />} />
              <Route path="/auth" element={<AuthGuard />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
      </TranslationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
