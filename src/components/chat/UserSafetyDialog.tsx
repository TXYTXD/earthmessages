import { useState } from "react";
import { Flag, Ban, ShieldCheck, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const REPORT_REASONS = [
  "Spam",
  "Harassment or bullying",
  "Inappropriate content",
  "Pretending to be someone else",
  "Something else",
];

interface UserSafetyDialogProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  isBlocked: boolean;
  onBlock: () => Promise<boolean> | boolean;
  onUnblock: () => Promise<boolean> | boolean;
  onReport: (reason: string, details?: string) => Promise<boolean> | boolean;
}

export function UserSafetyDialog({ open, onClose, userName, isBlocked, onBlock, onUnblock, onReport }: UserSafetyDialogProps) {
  const [mode, setMode] = useState<"menu" | "report">("menu");
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setMode("menu");
    setReason(null);
    setDetails("");
    onClose();
  };

  const submitReport = async () => {
    if (!reason) return;
    setBusy(true);
    const ok = await onReport(reason, details);
    setBusy(false);
    if (ok) close();
  };

  const toggleBlock = async () => {
    setBusy(true);
    const ok = await (isBlocked ? onUnblock() : onBlock());
    setBusy(false);
    if (ok) close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "report" && (
              <button onClick={() => setMode("menu")} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <ShieldCheck className="w-4 h-4 text-primary" />
            {mode === "menu" ? userName : `Report ${userName}`}
          </DialogTitle>
        </DialogHeader>

        {mode === "menu" ? (
          <div className="space-y-2">
            <button
              onClick={() => setMode("report")}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent transition-colors text-left"
            >
              <Flag className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Report {userName}</p>
                <p className="text-[12px] text-muted-foreground">Tell us what's wrong. Reports are private.</p>
              </div>
            </button>
            <button
              onClick={toggleBlock}
              disabled={busy}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent transition-colors text-left disabled:opacity-50"
            >
              <Ban className="w-4 h-4 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{isBlocked ? `Unblock ${userName}` : `Block ${userName}`}</p>
                <p className="text-[12px] text-muted-foreground">
                  {isBlocked
                    ? "You'll see their messages and calls again."
                    : "You won't see their messages, and their calls won't ring."}
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full p-2.5 rounded-lg border text-left text-sm transition-colors ${
                    reason === r ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Input
              placeholder="Anything else we should know? (optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={300}
            />
            <Button className="w-full" disabled={!reason || busy} onClick={submitReport}>
              {busy ? "Sending…" : "Send report"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
