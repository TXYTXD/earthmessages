import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, MessageCircle, ArrowLeft, Shield, Zap, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";

type AuthView = "login" | "signup" | "forgot" | "verify" | "reset-password";

export default function AuthPage() {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handle tokens in URL hash (email verification + password recovery)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset-password");
      } else if (event === "SIGNED_IN" && session && view !== "reset-password") {
        navigate("/", { replace: true });
      }
    });

    // Also check URL hash for recovery type on initial load
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      if (params.get("type") === "recovery") {
        setView("reset-password");
      }
    }

    return () => subscription.unsubscribe();
  }, [navigate, view]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast({ title: "Check your email", description: "We sent you a password reset link." });
      setView("login");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "signup" });
      if (error) throw error;
      toast({ title: "Email verified!", description: "Your account is now active." });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Verification failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "Enter the 6-digit code we sent to verify your account." });
        setView("verify");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.redirected) return;
      if (result.error) throw result.error;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign-in failed", description: error?.message ?? "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<AuthView, string> = {
    login: "Welcome back",
    signup: "Create account",
    forgot: "Reset password",
    verify: "Verify your email",
    "reset-password": "Set new password",
  };

  const subtitles: Record<AuthView, string> = {
    login: "Sign in to continue to UMS Messages",
    signup: "Sign up to start messaging securely",
    forgot: "Enter your email to receive a reset link",
    verify: `Enter the 6-digit code sent to ${email}`,
    "reset-password": "Enter your new password below",
  };

  const inputClass =
    "w-full pl-10 pr-4 py-3 bg-muted/50 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all duration-200";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] p-10 relative overflow-hidden" style={{ background: "var(--messenger-gradient)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/20 blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-56 h-56 rounded-full bg-white/10 blur-[80px]" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white font-display">UMS Messages</span>
          </div>
          <h2 className="text-3xl font-bold text-white font-display leading-tight mb-4">
            Private messaging
            <br />
            for everyone.
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            End-to-end encrypted conversations, HD video calls, and real-time translation — all in one platform.
          </p>
        </div>
        <div className="relative z-10 space-y-4">
          {[
            { icon: Shield, text: "End-to-end encrypted" },
            { icon: Zap, text: "Lightning fast delivery" },
            { icon: Globe, text: "50+ languages supported" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-white/80 text-sm">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <item.icon className="w-4 h-4 text-white" />
              </div>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20"
              style={{ background: "var(--messenger-gradient)" }}
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-display gradient-text">UMS Messages</h1>
            <p className="text-muted-foreground text-xs mt-1">Private & secure communication</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold font-display mb-1">{titles[view]}</h2>
                <p className="text-sm text-muted-foreground">{subtitles[view]}</p>
              </div>

              {view === "reset-password" ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputClass.replace("pr-4", "pr-12")}
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <SubmitButton loading={loading} text="Update Password" />
                </form>
              ) : view === "verify" ? (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                        <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <SubmitButton loading={loading} text="Verify" disabled={otpCode.length < 6} />
                  <BackLink onClick={() => setView("login")} />
                </form>
              ) : view === "forgot" ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
                  </div>
                  <SubmitButton loading={loading} text="Send Reset Link" />
                  <BackLink onClick={() => setView("login")} />
                </form>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {view === "signup" && (
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="text" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} required />
                      </div>
                    )}
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass.replace("pr-4", "pr-12")}
                        required
                        minLength={6}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {view === "login" && (
                      <div className="text-right">
                        <button type="button" onClick={() => setView("forgot")} className="text-xs text-primary hover:underline">Forgot password?</button>
                      </div>
                    )}
                    <SubmitButton loading={loading} text={view === "login" ? "Sign In" : "Create Account"} />
                  </form>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">or continue with</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <SocialButton
                      provider="google"
                      loading={loading}
                      onClick={() => handleOAuth("google")}
                    />
                    <SocialButton
                      provider="apple"
                      loading={loading}
                      onClick={() => handleOAuth("apple")}
                    />
                  </div>

                  <div className="mt-6 text-center">
                    <button onClick={() => setView(view === "login" ? "signup" : "login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {view === "login" ? "Don't have an account? " : "Already have an account? "}
                      <span className="text-primary font-medium">{view === "login" ? "Sign up" : "Sign in"}</span>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Back to landing */}
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/welcome")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ loading, text, disabled }: { loading: boolean; text: string; disabled?: boolean }) {
  return (
    <Button
      type="submit"
      disabled={loading || disabled}
      className="w-full h-11 rounded-xl font-medium text-sm gap-2 shadow-lg shadow-primary/20"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
      ) : (
        <>
          {text}
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </Button>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <div className="text-center">
      <button type="button" onClick={onClick} className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" />
        Back to sign in
      </button>
    </div>
  );
}

function SocialButton({
  provider,
  loading,
  onClick,
}: {
  provider: "google" | "apple";
  loading: boolean;
  onClick: () => void;
}) {
  const label = provider === "google" ? "Google" : "Apple";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="h-11 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
    >
      {provider === "google" ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.07-1.1-.16-1.6H12z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.365 1.43c0 1.14-.42 2.22-1.18 3.04-.83.9-2.18 1.6-3.3 1.5-.13-1.1.43-2.27 1.18-3.04.83-.86 2.27-1.5 3.3-1.5zM20.5 17.4c-.55 1.27-.81 1.84-1.52 2.96-.99 1.55-2.39 3.49-4.13 3.5-1.55.02-1.95-1.01-4.05-1-2.1.01-2.54 1.02-4.09 1.01-1.74-.01-3.07-1.76-4.06-3.31C-.13 17.05-.4 11.94 1.74 9.21c1.52-1.94 3.92-3.07 6.18-3.07 2.3 0 3.74 1.26 5.64 1.26 1.84 0 2.96-1.26 5.62-1.26 2.01 0 4.14 1.1 5.66 3-4.97 2.72-4.16 9.83-4.34 8.26z" />
        </svg>
      )}
      {label}
    </button>
  );
}
