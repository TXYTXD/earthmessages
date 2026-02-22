import { useState } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";

interface PinVerifyDialogProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  title?: string;
}

export function PinVerifyDialog({ open, onVerified, onCancel, verifyPin, title = "Enter your PIN" }: PinVerifyDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleVerify = async () => {
    setLoading(true);
    setError(false);
    const valid = await verifyPin(pin);
    setLoading(false);
    if (valid) {
      setPin("");
      onVerified();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-xl border border-border p-6 max-w-sm w-full space-y-5 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-primary" />
        </div>

        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your PIN to continue
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP maxLength={6} value={pin} onChange={(v) => { setPin(v); setError(false); }}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <p className="text-sm text-destructive font-medium">Incorrect PIN. Try again.</p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setPin(""); setError(false); onCancel(); }}
            className="flex-1 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={pin.length < 4 || loading}
            className="flex-1 rounded-xl"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              "Verify"
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
