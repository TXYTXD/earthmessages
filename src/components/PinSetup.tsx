import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PinSetupProps {
  onComplete: (pin: string) => Promise<boolean>;
}

export function PinSetup({ onComplete }: PinSetupProps) {
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = () => {
    if (pin.length < 4) return;
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (confirmPin !== pin) {
      toast({ variant: "destructive", title: "PINs don't match", description: "Please try again." });
      setConfirmPin("");
      return;
    }
    setLoading(true);
    const success = await onComplete(pin);
    setLoading(false);
    if (!success) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save PIN. Try again." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center space-y-6"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/20"
          style={{ background: "var(--messenger-gradient)" }}
        >
          <Shield className="w-8 h-8 text-white" />
        </div>

        <div>
          <h2 className="text-xl font-bold font-display mb-1">
            {step === "create" ? "Set up your PIN" : "Confirm your PIN"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {step === "create"
              ? "Create a 4-6 digit PIN to protect sensitive actions"
              : "Enter your PIN again to confirm"}
          </p>
        </div>

        <div className="flex justify-center">
          {step === "create" ? (
            <InputOTP maxLength={6} value={pin} onChange={setPin}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          ) : (
            <InputOTP maxLength={6} value={confirmPin} onChange={setConfirmPin}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          )}
        </div>

        <Button
          onClick={step === "create" ? handleCreate : handleConfirm}
          disabled={
            loading ||
            (step === "create" ? pin.length < 4 : confirmPin.length < 4)
          }
          className="w-full h-11 rounded-xl font-medium text-sm gap-2 shadow-lg shadow-primary/20"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              {step === "create" ? "Continue" : "Set PIN"}
            </>
          )}
        </Button>

        {step === "confirm" && (
          <button
            onClick={() => {
              setStep("create");
              setConfirmPin("");
            }}
            className="text-sm text-primary hover:underline"
          >
            Go back
          </button>
        )}
      </motion.div>
    </div>
  );
}
