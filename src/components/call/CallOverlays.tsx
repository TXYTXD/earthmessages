import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, User } from "lucide-react";
import { useCall } from "@/contexts/CallContext";

export function IncomingCallOverlay() {
  const { callState, answerCall, declineCall } = useCall();

  if (callState.status !== "ringing" || !callState.isIncoming) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-2xl flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Ambient pulsing glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            background:
              "radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.35), transparent 60%)",
          }}
        />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center mb-10 relative"
        >
          {/* Pulsing rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute top-0 w-24 h-24 rounded-full border-2 border-primary/40"
              animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
            />
          ))}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-2xl font-bold text-primary-foreground mb-4 relative shadow-premium">
            {callState.remoteAvatar}
          </div>
          <p className="text-xl font-semibold">{callState.remoteName}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Incoming {callState.type} call...
          </p>
        </motion.div>

        <div className="flex items-center gap-10 relative">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              declineCall(callState.callId!);
            }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg shadow-destructive/40">
              <PhoneOff className="w-7 h-7 text-destructive-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Ignore</span>
          </motion.button>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              answerCall(callState.callId!, callState.type);
            }}
            className="flex flex-col items-center gap-2"
          >
            <motion.div
              animate={{ boxShadow: ["0 0 0 0 hsl(var(--success) / 0.6)", "0 0 0 18px hsl(var(--success) / 0)"] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-16 h-16 rounded-full bg-success flex items-center justify-center"
            >
              <Phone className="w-7 h-7 text-success-foreground" />
            </motion.div>
            <span className="text-sm font-medium text-muted-foreground">Accept</span>
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ActiveCallOverlay() {
  const {
    callState, hangUp, toggleMute, toggleVideo, isMuted, isVideoOff,
    localVideoRef, remoteVideoRef, remoteAudioRef, localStream, remoteStream,
  } = useCall();
  const [speakerOff, setSpeakerOff] = useState(false);

  // Attach streams and keep retrying play() while paused — a play() blocked
  // by autoplay rules (common on iOS) would otherwise leave the call frozen
  // with no sound/video even though media is arriving. Runs every second
  // (duration tick) during the call.
  useEffect(() => {
    const el = localVideoRef.current;
    const stream = localStream.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (el.paused) el.play().catch(() => {});
  }, [callState.status, callState.duration, localVideoRef, localStream]);

  useEffect(() => {
    const el = remoteVideoRef.current;
    const stream = remoteStream.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (el.paused) el.play().catch(() => {});
  }, [callState.status, callState.duration, remoteVideoRef, remoteStream]);

  useEffect(() => {
    const el = remoteAudioRef.current;
    const stream = remoteStream.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (el.paused) el.play().catch(() => {});
  }, [callState.status, callState.duration, remoteAudioRef, remoteStream]);

  // Speaker toggle: mute remote audio output
  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = speakerOff;
    if (remoteVideoRef.current) remoteVideoRef.current.muted = speakerOff;
  }, [speakerOff, remoteAudioRef, remoteVideoRef]);

  if (callState.status !== "calling" && callState.status !== "connecting" && callState.status !== "connected") return null;

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[99] bg-background flex flex-col"
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="flex-1 relative flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary to-muted overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{ background: "radial-gradient(circle at 30% 20%, hsl(var(--primary) / 0.25), transparent 60%)" }}
        />

        {callState.type === "video" ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Profile fallback when remote video unavailable (rough heuristic: no track yet) */}
            {!remoteStream.current?.getVideoTracks().some((t) => t.enabled) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-4xl font-bold text-primary-foreground shadow-premium">
                  {callState.remoteAvatar}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center relative">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-5 text-3xl font-bold text-primary-foreground shadow-premium"
            >
              {callState.remoteAvatar}
            </motion.div>
            <p className="text-2xl font-semibold">{callState.remoteName}</p>
            <p className="text-sm text-muted-foreground mt-1.5">
              {callState.status === "calling" ? "Calling..." : callState.status === "connected" ? formatDuration(callState.duration) : "Connecting..."}
            </p>
          </div>
        )}

        {/* Local video PiP with profile fallback when camera off */}
        {callState.type === "video" && (
          <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-secondary">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? "opacity-0" : ""}`}
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-secondary">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-lg font-bold text-primary-foreground">
                  <User className="w-7 h-7" />
                </div>
              </div>
            )}
            {/* Local muted badge */}
            {isMuted && (
              <div className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-destructive flex items-center justify-center shadow-lg">
                <MicOff className="w-3.5 h-3.5 text-destructive-foreground" />
              </div>
            )}
          </div>
        )}

        {/* Top status badge */}
        <div className="absolute top-4 left-4 glass rounded-full px-4 py-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-foreground text-sm font-medium">
            {callState.status === "calling" ? "Calling..." : callState.status === "connected" ? formatDuration(callState.duration) : "Connecting..."}
          </span>
        </div>

        {/* Muted indicator for voice calls */}
        {callState.type === "voice" && isMuted && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-destructive/90 backdrop-blur-md text-destructive-foreground rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-lg">
            <MicOff className="w-3.5 h-3.5" /> Your mic is muted
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 flex items-center justify-center gap-3 sm:gap-4 border-t border-border glass-nav">
        <ControlButton
          active={isMuted}
          onClick={toggleMute}
          activeIcon={<MicOff className="w-6 h-6" />}
          icon={<Mic className="w-6 h-6" />}
          label={isMuted ? "Unmute" : "Mute"}
        />

        <ControlButton
          active={speakerOff}
          onClick={() => setSpeakerOff((v) => !v)}
          activeIcon={<VolumeX className="w-6 h-6" />}
          icon={<Volume2 className="w-6 h-6" />}
          label={speakerOff ? "Speaker off" : "Speaker"}
        />

        {callState.type === "video" && (
          <ControlButton
            active={isVideoOff}
            onClick={toggleVideo}
            activeIcon={<VideoOff className="w-6 h-6" />}
            icon={<Video className="w-6 h-6" />}
            label={isVideoOff ? "Camera off" : "Camera"}
          />
        )}

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={hangUp}
          className="w-16 h-14 rounded-full bg-destructive flex items-center justify-center shadow-lg shadow-destructive/40 ml-2"
        >
          <PhoneOff className="w-6 h-6 text-destructive-foreground" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function ControlButton({
  active, onClick, icon, activeIcon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; activeIcon: React.ReactNode; label: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1"
    >
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
          active
            ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
            : "bg-accent/80 text-foreground backdrop-blur-md hover:bg-accent"
        }`}
      >
        {active ? activeIcon : icon}
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </motion.button>
  );
}
