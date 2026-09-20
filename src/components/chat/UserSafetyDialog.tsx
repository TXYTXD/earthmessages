import { useState } from "react";
import { useT } from "@/contexts/LanguageContext";
import { Flag, Ban, ShieldCheck, ChevronLeft , Eraser } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// The label shown to the reporter is translated; the reason stored with the
// report stays in English so moderation always reads the same words.
const REPORT_REASONS = [
  { value: "Spam", key: "safety.reasonSpam" },
  { value: "Harassment or bullying", key: "safety.reasonHarassment" },
  { value: "Inappropriate content", key: "safety.reasonContent" },
  { value: "Pretending to be someone else", key: "safety.reasonImpersonation" },
  { value: "Something else", key: "safety.reasonOther" },
] as const;

interface UserSafetyDialogProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  isBlocked: boolean;
  onBlock: () => Promise<boolean> | boolean;
  onUnblock: () => Promise<boolean> | boolean;
  onReport: (reason: string, details?: string) => Promise<boolean> | boolean;
  /** Hide this conversation's history for the person viewing it */
  onClearChat?: () => Promise<boolean> | boolean;
}

export function UserSafetyDialog({ open, onClose, userName, isBlocked, onBlock, onUnblock, onReport, onClearChat }: UserSafetyDialogProps) {
  const t = useT();
  const [mode, setMode] = useState<"menu" | "report" | "clear">("menu");
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
            {mode !== "menu" && (
              <button onClick={() => setMode("menu")} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <ShieldCheck className="w-4 h-4 text-primary" />
            {mode === "menu" ? userName : mode === "clear" ? t("safety.clear") : t("safety.report", { name: userName })}
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
                <p className="text-sm font-medium">{t("safety.report", { name: userName })}</p>
                <p className="text-[12px] text-muted-foreground">{t("safety.reportHint")}</p>
              </div>
            </button>
            <button
              onClick={toggleBlock}
              disabled={busy}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent transition-colors text-left disabled:opacity-50"
            >
              <Ban className="w-4 h-4 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{isBlocked ? t("safety.unblock", { name: userName }) : t("safety.block", { name: userName })}</p>
                <p className="text-[12px] text-muted-foreground">
                  {isBlocked ? t("safety.unblockHint") : t("safety.blockHint")}
                </p>
              </div>
            </button>
            {onClearChat && (
              <button
                onClick={() => setMode("clear")}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent transition-colors text-left"
              >
                <Eraser className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t("safety.clear")}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {t("safety.clearHint", { name: userName })}
                  </p>
                </div>
              </button>
            )}
          </div>
        ) : mode === "clear" ? (
          <div className="space-y-3">
            <p className="text-sm">
              {t("safety.clearConfirm")}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {t("safety.clearDetail", { name: userName })}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode("menu")} disabled={busy}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const ok = await onClearChat!();
                  setBusy(false);
                  if (ok) close();
                }}
              >
                {busy ? t("safety.clearing") : t("safety.clearYes")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full p-2.5 rounded-lg border text-left text-sm transition-colors ${
                    reason === r.value ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent"
                  }`}
                >
                  {t(r.key)}
                </button>
              ))}
            </div>
            <Input
              placeholder={t("safety.details")}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={300}
            />
            <Button className="w-full" disabled={!reason || busy} onClick={submitReport}>
              {busy ? t("safety.sending") : t("safety.sendReport")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
