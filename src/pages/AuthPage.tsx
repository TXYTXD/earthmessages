import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const type = params.get("type");

      if (type === "recovery") {
        // Password reset link clicked — show new password form
        setView("reset-password");
      } else if (params.get("access_token")) {
        // Email verification — auto sign-in
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            navigate("/", { replace: true });
          }
        });
        return () => subscription.unsubscribe();
      }
    }
  }, [navigate]);

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
        toast({ title: "Check your email", description: "We sent you a 6-digit verification code." });
        setOtpCode("");
        setView("verify");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderTitle = () => {
    switch (view) {
      case "login": return "Welcome back";
      case "signup": return "Create account";
      case "forgot": return "Reset password";
      case "verify": return "Verify your email";
      case "reset-password": return "Set new password";
    }
  };

  const renderSubtitle = () => {
    switch (view) {
      case "login": return "Sign in to continue";
      case "signup": return "Sign up to get started";
      case "forgot": return "Enter your email to receive a reset link";
      case "verify": return `Enter the 6-digit code sent to ${email}`;
      case "reset-password": return "Enter your new password below";
    }
  };

  const renderGradientButton = (text: string, disabled: boolean, type: "submit" | "button" = "submit") => (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type={type} disabled={disabled}
      className="w-full py-2.5 rounded-full font-medium text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
      style={{ background: "var(--messenger-gradient)" }}>
      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{text}<ArrowRight className="w-4 h-4" /></>}
    </motion.button>
  );

  const inputClass = "w-full pl-10 pr-4 py-2.5 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--messenger-gradient)" }}>
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">umsmessages</h1>
          <p className="text-muted-foreground text-sm mt-1">Connect & Communicate</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-bold mb-1">{renderTitle()}</h2>
          <p className="text-[13px] text-muted-foreground mb-5">{renderSubtitle()}</p>

          {view === "reset-password" ? (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} placeholder="New password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {renderGradientButton("Update Password", loading)}
            </form>
          ) : view === "verify" ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                    <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {renderGradientButton("Verify", loading || otpCode.length < 6)}
              <div className="text-center">
                <button type="button" onClick={() => setView("login")} className="text-[13px] text-primary font-medium hover:underline">Back to sign in</button>
              </div>
            </form>
          ) : view === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
              </div>
              {renderGradientButton("Send Reset Link", loading)}
              <div className="mt-3 text-center">
                <button type="button" onClick={() => setView("login")} className="text-[13px] text-primary font-medium hover:underline">Back to sign in</button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-3">
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
                  <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {view === "login" && (
                  <div className="text-right">
                    <button type="button" onClick={() => setView("forgot")} className="text-[12px] text-primary hover:underline">Forgot password?</button>
                  </div>
                )}
                {renderGradientButton(view === "login" ? "Sign In" : "Create Account", loading)}
              </form>
              <div className="mt-5 text-center">
                <button onClick={() => setView(view === "login" ? "signup" : "login")} className="text-[13px] text-muted-foreground hover:text-primary transition-colors">
                  {view === "login" ? "Don't have an account? " : "Already have an account? "}
                  <span className="text-primary font-medium">{view === "login" ? "Sign up" : "Sign in"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
