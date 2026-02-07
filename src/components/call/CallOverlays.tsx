import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { useCall } from "@/contexts/CallContext";

export function IncomingCallOverlay() {
  const { callState, answerCall, declineCall } = useCall();

  if (callState.status !== "ringing" || !callState.isIncoming) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 right-4 z-[100] bg-card border border-border rounded-2xl shadow-2xl p-5 w-80"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
            {callState.remoteAvatar}
          </div>
          <div>
            <p className="font-semibold">{callState.remoteName}</p>
            <p className="text-sm text-muted-foreground">
              Incoming {callState.type} call...
            </p>
          </div>
        </div>

        {/* Pulsing animation */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-4 h-4 rounded-full bg-success animate-ping absolute" />
            <div className="w-4 h-4 rounded-full bg-success relative" />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => declineCall(callState.callId!)}
            className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center"
          >
            <PhoneOff className="w-6 h-6 text-destructive-foreground" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => answerCall(callState.callId!, callState.type)}
            className="w-14 h-14 rounded-full bg-success flex items-center justify-center"
          >
            <Phone className="w-6 h-6 text-success-foreground" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ActiveCallOverlay() {
  const { callState, hangUp, toggleMute, toggleVideo, isMuted, isVideoOff, localVideoRef, remoteVideoRef } = useCall();

  if (callState.status !== "calling" && callState.status !== "connected") return null;

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
      {/* Remote video / avatar */}
      <div className="flex-1 relative flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
        {callState.type === "video" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-foreground">
              {callState.remoteAvatar}
            </div>
            <p className="text-xl font-semibold">{callState.remoteName}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {callState.status === "calling" ? "Calling..." : callState.status === "connected" ? formatDuration(callState.duration) : "Connecting..."}
            </p>
          </div>
        )}

        {/* Local video PiP */}
        {callState.type === "video" && (
          <div className="absolute top-4 right-4 w-32 h-44 rounded-xl overflow-hidden border-2 border-border shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Status overlay for video calls */}
        {callState.type === "video" && (
          <div className="absolute top-4 left-4 bg-black/50 rounded-full px-4 py-1.5">
            <span className="text-white text-sm font-medium">
              {callState.status === "calling" ? "Calling..." : callState.status === "connected" ? formatDuration(callState.duration) : "Connecting..."}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 flex items-center justify-center gap-4 border-t border-border bg-card">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? "bg-destructive/20 text-destructive" : "bg-accent text-foreground"
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </motion.button>

        {callState.type === "video" && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isVideoOff ? "bg-destructive/20 text-destructive" : "bg-accent text-foreground"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={hangUp}
          className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center"
        >
          <PhoneOff className="w-6 h-6 text-destructive-foreground" />
        </motion.button>
      </div>
    </motion.div>
  );
}
