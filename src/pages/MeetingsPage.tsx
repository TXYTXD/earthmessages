import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, Link2, Calendar, Copy, Check, X, ArrowRight } from "lucide-react";
import { useMeetings, meetingLink, type Meeting } from "@/hooks/useMeetings";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { riseIn, stagger, springy, snappy } from "@/lib/motion";

function whenLabel(m: Meeting, now: string, soon: string): string {
  if (!m.starts_at) return now;
  const d = new Date(m.starts_at);
  if (Number.isNaN(d.getTime())) return soon;
  return d.toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function MeetingRow({ meeting, onOpen, onEnd, isHost }: {
  meeting: Meeting;
  onOpen: () => void;
  onEnd: () => void;
  isHost: boolean;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const link = meetingLink(meeting.code);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard access can be refused; the code is still readable on screen.
      toast({ title: t("meet.copyFailed"), description: link });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <motion.div
      variants={riseIn}
      className="p-3.5 rounded-[22px] glass-tint glass-float flex items-center gap-3"
    >
      <div className="w-11 h-11 rounded-2xl bg-primary/12 flex items-center justify-center flex-shrink-0">
        {meeting.starts_at
          ? <Calendar className="w-5 h-5 text-primary" />
          : <Video className="w-5 h-5 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate">{meeting.title}</p>
        <p className="text-[12px] text-muted-foreground truncate">
          {whenLabel(meeting, t("meet.openNow"), t("meet.scheduled"))} · {meeting.code}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={t("meet.copyLink")}
        title={t("meet.copyLink")}
        className="w-10 h-10 rounded-full press flex items-center justify-center text-muted-foreground flex-shrink-0"
      >
        {copied ? <Check className="w-[18px] h-[18px] text-success" /> : <Copy className="w-[18px] h-[18px]" />}
      </button>
      {isHost && (
        <button
          type="button"
          onClick={onEnd}
          aria-label={t("meet.end")}
          title={t("meet.end")}
          className="w-10 h-10 rounded-full press flex items-center justify-center text-muted-foreground flex-shrink-0"
        >
          <X className="w-[18px] h-[18px]" />
        </button>
      )}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        transition={snappy}
        onClick={onOpen}
        className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold flex items-center gap-1.5 flex-shrink-0"
      >
        {t("meet.join")}
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const { meetings, loading, createMeeting, endMeeting } = useMeetings();

  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async (scheduled: boolean) => {
    if (busy) return;
    setBusy(true);
    const startsAt = scheduled && when ? new Date(when).toISOString() : null;
    const m = await createMeeting(title || t("meet.defaultTitle"), startsAt);
    setBusy(false);
    if (!m) return;
    setTitle("");
    setWhen("");
    // A meeting with a time on it is for later; one without is for right now.
    if (!startsAt) navigate(`/meet/${m.code}`);
    else toast({ title: t("meet.scheduledToast"), description: meetingLink(m.code) });
  };

  const join = () => {
    // People paste the whole link as often as they type the code.
    const raw = joinCode.trim();
    if (!raw) return;
    const code = raw.includes("/") ? raw.split("/").filter(Boolean).pop()! : raw;
    navigate(`/meet/${code.toLowerCase()}`);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springy}
          className="text-[28px] font-bold tracking-tight px-1"
        >
          {t("meet.title")}
        </motion.h1>

        {/* Start one */}
        <motion.div variants={riseIn} initial="hidden" animate="show" className="p-4 rounded-[24px] glass-tint glass-float space-y-3">
          <div>
            <h2 className="text-[16px] font-semibold">{t("meet.newTitle")}</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">{t("meet.newHint")}</p>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("meet.namePlaceholder")}
            maxLength={120}
            className="glass-inset rounded-full h-11 px-4"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="flex-1 h-11 rounded-full"
              disabled={busy}
              onClick={() => start(false)}
            >
              <Video className="w-4 h-4 mr-2" />
              {t("meet.startNow")}
            </Button>
            <div className="flex-1 flex gap-2">
              <Input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="glass-inset rounded-full h-11 px-4 flex-1"
                aria-label={t("meet.forLater")}
              />
              <Button
                variant="outline"
                className="h-11 rounded-full px-4"
                disabled={busy || !when}
                onClick={() => start(true)}
              >
                <Calendar className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Join one */}
        <motion.div variants={riseIn} initial="hidden" animate="show" className="p-4 rounded-[24px] glass-tint glass-float space-y-3">
          <div>
            <h2 className="text-[16px] font-semibold">{t("meet.joinTitle")}</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">{t("meet.joinHint")}</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") join(); }}
              placeholder="ums-abcd-efg"
              className="glass-inset rounded-full h-11 px-4 flex-1"
            />
            <Button className="h-11 rounded-full px-5" disabled={!joinCode.trim()} onClick={join}>
              <Link2 className="w-4 h-4 mr-2" />
              {t("meet.join")}
            </Button>
          </div>
        </motion.div>

        {/* Yours */}
        <div className="px-1 pt-2">
          <span className="text-[12px] font-bold tracking-widest text-muted-foreground">
            {t("meet.yours")}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : meetings.length === 0 ? (
          <p className="text-[14px] text-muted-foreground px-1 py-4">{t("meet.none")}</p>
        ) : (
          <motion.div variants={stagger(0.02)} initial="hidden" animate="show" className="space-y-2">
            {meetings.map((m) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                isHost={m.host_id === user?.id}
                onOpen={() => navigate(`/meet/${m.code}`)}
                onEnd={() => void endMeeting(m.id)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
