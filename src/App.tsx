import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { AndroidUpdateGate } from "@/components/AndroidUpdateGate";
import MeetingsPage from "@/pages/MeetingsPage";
import MeetingRoomPage from "@/pages/MeetingRoomPage";
import { AmbientHalos } from "@/components/AmbientHalos";
import { usePin } from "@/hooks/usePin";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { IncomingCallOverlay, ActiveCallOverlay } from "@/components/call/CallOverlays";
import { PinSetup } from "@/components/PinSetup";
import ChatsPage from "@/pages/ChatsPage";
import VideoCallPage from "@/pages/VideoCallPage";
import CallsPage from "@/pages/CallsPage";
import SettingsPage from "@/pages/SettingsPage";
import ThemeMarketPage from "@/pages/ThemeMarketPage";
import { ThemeAmbience } from "@/components/ThemeAmbience";
import StoriesPage from "@/pages/StoriesPage";
import AccountPage from "@/pages/AccountPage";
import AuthPage from "@/pages/AuthPage";
import LandingPage from "@/pages/LandingPage";
import NotFound from "./pages/NotFound";
import InstallPage from "@/pages/InstallPage";
import DownloadPage from "@/pages/DownloadPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import NewsPage from "@/pages/NewsPage";
import AIChatPage from "@/pages/AIChatPage";
import CalendarPage from "@/pages/CalendarPage";
import CommunitiesPage from "@/pages/CommunitiesPage";

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
    // The whole point of a meeting link is that you can send it to anyone.
    // Someone who follows one without an account has to sign up first, and
    // they should land in the meeting afterwards rather than on the home
    // page wondering where it went.
    try {
      const path = window.location.pathname;
      if (path.startsWith("/meet/")) sessionStorage.setItem(PENDING_PATH_KEY, path);
    } catch {
      /* private browsing */
    }
    return <Navigate to="/welcome" replace />;
  }

  if (!hasPin) {
    return <PinSetup onComplete={savePin} />;
  }

  return (
    <CallProvider>
      <ResumeAfterSignIn />
      <ThemeAmbience />
      <AmbientHalos />
      <div className="flex h-screen overflow-hidden app-shell">
        <AppSidebar />
        <main className="flex-1 overflow-hidden flex pb-[104px] md:pb-0">
          <Routes>
            <Route path="/" element={<ChatsPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/video" element={<VideoCallPage />} />
            <Route path="/calls" element={<CallsPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/meet/:code" element={<MeetingRoomPage />} />
            <Route path="/ai" element={<AIChatPage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/themes" element={<ThemeMarketPage />} />
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

const PENDING_PATH_KEY = "ums-after-signin";

// Takes someone to wherever they were headed before they had to sign in.
function ResumeAfterSignIn() {
  const navigate = useNavigate();
  useEffect(() => {
    let path: string | null = null;
    try {
      path = sessionStorage.getItem(PENDING_PATH_KEY);
      if (path) sessionStorage.removeItem(PENDING_PATH_KEY);
    } catch {
      /* private browsing */
    }
    // Only ever an in-app path, never something a link could point elsewhere.
    if (path && path.startsWith("/") && !path.startsWith("//")) {
      navigate(path, { replace: true });
    }
  }, [navigate]);
  return null;
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

function UpdatePrompt() {
  useAppUpdate();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <ThemeProvider>
      <TranslationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <UpdatePrompt />
        <AndroidUpdateGate />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/welcome" element={<LandingPage />} />
              <Route path="/auth" element={<AuthGuard />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
      </TranslationProvider>
    </ThemeProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
