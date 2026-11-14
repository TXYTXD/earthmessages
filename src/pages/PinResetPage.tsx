import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "@/pages/NotFound";
import { springy } from "@/lib/motion";

/**
 * Reached only from the "Forgot PIN?" email. Anyone who wanders here
 * without having just opened that email sees an ordinary "page not found",
 * and the server refuses a new PIN from them regardless.
 */
export default function PinResetPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [step, setStep] = useState<"create" | "confirm" | "done">("create");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The link signs the person in as the page loads, so wait for that first.
  useEffect(() => {
    if (loading) return;
    if (!session) {
      // Give the sign-in in the link's address a moment to finish.
      const t = setTimeout(() => setAllowed((a) => (a === null ? false : a)), 2500);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    void (async () => {
      const { data, error: e } = await (supabase.rpc as any)("can_reset_pin_from_email");
      if (!cancelled) setAllowed(!e && !!data);
    })();
    return () => { cancelled = true; };
  }, [session, loading]);

  const save = async () => {
    if (confirm !== pin) {
      setError("Those PINs don't match. Try again.");
      setConfirm("");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await (supabase.rpc as any)("reset_pin_from_email", { _pin: pin });
    setBusy(false);
    if (e) {
      setError(/expired|not opened/i.test(e.message)
        ? "This link has expired. Ask for a new one from the PIN screen."
        : "Couldn't save your new PIN. Try again.");
      return;
    }
    setStep("done");
  };

  if (allowed === false) return <NotFound />;

  if (allowed === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  const value = step === "confirm" ? confirm : pin;
  const setValue = step === "confirm" ? setConfirm : setPin;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-5 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[480px] h-[480px] max-w-[120vw] rounded-full opacity-25 blur-[120px]"
          style={{ background: "var(--messenger-gradient)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springy}
        className="w-full max-w-sm relative rounded-[28px] glass-tint glass-float p-7 text-center space-y-6"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "var(--messenger-gradient)" }}
        >
          {step === "done" ? <CheckCircle2 className="w-8 h-8 text-white" /> : <KeyRound className="w-8 h-8 text-white" />}
        </div>

        {step === "done" ? (
          <>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight">New PIN saved</h1>
              <p className="text-sm text-muted-foreground">Use it next time the app asks for your PIN.</p>
            </div>
            <Button onClick={() => navigate("/", { replace: true })} className="w-full h-12 rounded-xl">
              Back to UMS
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight">
                {step === "create" ? "Choose a new PIN" : "Type it again"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {step === "create" ? "4 to 6 digits. Your old PIN stops working." : "Just to be sure."}
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP maxLength={6} value={value} onChange={(v) => { setValue(v.replace(/\D/g, "")); setError(null); }}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <Button
              onClick={step === "create" ? () => setStep("confirm") : () => void save()}
              disabled={busy || value.length < 4}
              className="w-full h-12 rounded-xl gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {step === "create" ? "Continue" : "Save new PIN"}
            </Button>

            {step === "confirm" && (
              <button
                type="button"
                onClick={() => { setStep("create"); setConfirm(""); setError(null); }}
                className="text-sm text-primary hover:underline py-1"
              >
                Go back
              </button>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
