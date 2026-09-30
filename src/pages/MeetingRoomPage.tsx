import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Copy, Check, Users } from "lucide-react";
import { useMeetingRoom, MAX_IN_MEETING, type Peer } from "@/hooks/useMeetingRoom";
import { meetingLink } from "@/hooks/useMeetings";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { springy, snappy, riseIn } from "@/lib/motion";

// A grid that stays square-ish however many people are in it, rather than
// one row that squeezes everyone into slivers.
function columnsFor(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-2 sm:grid-cols-3";
  return "grid-cols-3 sm:grid-cols-4";
}

function Tile({ stream, label, muted, mirrored, connecting, initials }: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirrored?: boolean;
  connecting?: boolean;
  initials: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  const hasPicture = !!stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");

  return (
    <motion.div
      variants={riseIn}
      layout
      transition={springy}
      className="relative rounded-[22px] overflow-hidden bg-secondary/70 aspect-[4/3] glass-float"
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
        // A front camera shown un-mirrored makes people reach the wrong way.
        style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      />
      {!hasPicture && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-[20px] font-bold text-primary">
            {initials}
          </div>
        </div>
      )}
      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <span className="absolute left-2.5 bottom-2.5 chip rounded-full px-2.5 py-1 text-[12px] font-semibold max-w-[85%] truncate">
        {label}
      </span>
    </motion.div>
  );
}

export default function MeetingRoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useT();
  const [copied, setCopied] = useState(false);

  const {
    status, error, meeting, peers, getLocalStream, localReady,
    micOn, cameraOn, sharing, toggleMic, toggleCamera, toggleShare, leave,
  } = useMeetingRoom(code);

  const myName = (user?.user_metadata?.display_name as string) || t("common.you");
  const myInitials = myName.slice(0, 2).toUpperCase();

  const hangUp = async () => {
    await leave();
    navigate("/meetings");
  };

  const copy = async () => {
    if (!meeting) return;
    const link = meetingLink(meeting.code);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: t("meet.copyFailed"), description: link });
    }
  };

  // Leaving by pressing Back should look the same to the others as leaving
  // by pressing the red button.
  useEffect(() => {
    return () => { void leave(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
        <div className="w-16 h-16 rounded-full bg-destructive/12 flex items-center justify-center">
          <VideoOff className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">{t("meet.cannotJoin")}</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <Button className="rounded-full mt-2" onClick={() => navigate("/meetings")}>
          {t("meet.backToMeetings")}
        </Button>
      </div>
    );
  }

  const tiles = peers.length + 1;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Who and where */}
      <motion.div
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springy}
        className="mx-3 mt-3 rounded-[22px] glass-tint glass-float px-4 py-2.5 flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold truncate">{meeting?.title ?? t("meet.title")}</p>
          <p className="text-[12px] text-muted-foreground truncate">
            {t("meet.peopleHere", { count: String(tiles), max: String(MAX_IN_MEETING) })}
            {meeting ? ` · ${meeting.code}` : ""}
          </p>
        </div>
        <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          {tiles}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={t("meet.copyLink")}
          title={t("meet.copyLink")}
          className="w-10 h-10 rounded-full press flex items-center justify-center text-muted-foreground flex-shrink-0"
        >
          {copied ? <Check className="w-[18px] h-[18px] text-success" /> : <Copy className="w-[18px] h-[18px]" />}
        </button>
      </motion.div>

      {/* Everyone */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        {status === "joining" ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{t("meet.joining")}</p>
          </div>
        ) : (
          <motion.div layout className={`grid gap-3 ${columnsFor(tiles)}`}>
            <AnimatePresence mode="popLayout">
              <Tile
                key="me"
                stream={localReady ? getLocalStream() : null}
                label={`${myName} (${t("common.you")})`}
                initials={myInitials}
                muted
                mirrored={!sharing}
              />
              {peers.map((p: Peer) => (
                <Tile
                  key={p.userId}
                  stream={p.stream}
                  label={p.name || t("common.someone")}
                  initials={p.avatar || "?"}
                  connecting={p.connecting}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {status === "live" && peers.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[13px] text-muted-foreground pt-5"
          >
            {t("meet.aloneHint")}
          </motion.p>
        )}
      </div>

      {/* Controls */}
      <motion.div
        initial={{ y: 26, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springy}
        className="mx-3 mb-3 rounded-full glass-tint glass-float px-3 py-2.5 flex items-center justify-center gap-2"
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          transition={snappy}
          onClick={toggleMic}
          aria-label={micOn ? t("call.mute") : t("call.unmute")}
          title={micOn ? t("call.mute") : t("call.unmute")}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            micOn ? "bg-secondary text-foreground" : "bg-destructive text-destructive-foreground"
          }`}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          transition={snappy}
          onClick={toggleCamera}
          aria-label={cameraOn ? t("call.cameraOff") : t("call.camera")}
          title={cameraOn ? t("call.cameraOff") : t("call.camera")}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            cameraOn ? "bg-secondary text-foreground" : "bg-destructive text-destructive-foreground"
          }`}
        >
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          transition={snappy}
          onClick={() => void toggleShare()}
          aria-label={sharing ? t("call.stopShare") : t("call.share")}
          title={sharing ? t("call.stopShare") : t("call.share")}
          className={`w-12 h-12 rounded-full items-center justify-center hidden sm:flex ${
            sharing ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
          }`}
        >
          <MonitorUp className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          transition={snappy}
          onClick={() => void hangUp()}
          aria-label={t("meet.leave")}
          title={t("meet.leave")}
          className="h-12 px-6 rounded-full bg-destructive text-destructive-foreground flex items-center gap-2 font-semibold"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="text-[14px]">{t("meet.leave")}</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
