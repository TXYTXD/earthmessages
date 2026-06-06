import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
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
        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center"
      >
        {/* Caller info */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center mb-10"
        >
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold mb-4 relative">
            {callState.remoteAvatar}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success animate-ping" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success" />
          </div>
          <p className="text-xl font-semibold">{callState.remoteName}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Incoming {callState.type} call...
          </p>
        </motion.div>

        {/* Accept / Ignore buttons */}
        <div className="flex items-center gap-10">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              declineCall(callState.callId!);
            }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center">
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
              e.preventDefault();
              answerCall(callState.callId!, callState.type);
            }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
              <Phone className="w-7 h-7 text-success-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Accept</span>
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ActiveCallOverlay() {
  const { callState, hangUp, toggleMute, toggleVideo, isMuted, isVideoOff, localVideoRef, remoteVideoRef, remoteAudioRef, localStream, remoteStream } = useCall();

  // Sync local stream to video element
  useEffect(() => {
    const el = localVideoRef.current;
    const stream = localStream.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [callState.status, callState.duration, localVideoRef, localStream]);

  // Sync remote stream to video element
  useEffect(() => {
    const el = remoteVideoRef.current;
    const stream = remoteStream.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [callState.status, callState.duration, remoteVideoRef, remoteStream]);

  // Sync remote stream to audio element (CRITICAL for voice calls — without this no audio plays)
  useEffect(() => {
    const el = remoteAudioRef.current;
    const stream = remoteStream.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [callState.status, callState.duration, remoteAudioRef, remoteStream]);

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
      {/* Always-mounted remote audio element — required for voice calls to be heard */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
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
