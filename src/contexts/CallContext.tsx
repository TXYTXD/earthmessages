import { createContext, useContext, ReactNode, useEffect, useRef, MutableRefObject } from "react";
import { useWebRTC, type CallState } from "@/hooks/useWebRTC";
import { useCallSounds } from "@/hooks/useCallSounds";

interface CallContextType {
  callState: CallState;
  isMuted: boolean;
  isVideoOff: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
  localStream: MutableRefObject<MediaStream | null>;
  remoteStream: MutableRefObject<MediaStream | null>;
  startCall: (receiverId: string, type: "voice" | "video") => Promise<void>;
  answerCall: (callId: string, type: "voice" | "video") => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};

export function CallProvider({ children }: { children: ReactNode }) {
  const webrtc = useWebRTC();
  const { playIncomingRing, playDialingTone, stopSound } = useCallSounds();
  const prevStatus = useRef(webrtc.callState.status);

  useEffect(() => {
    const { status, isIncoming } = webrtc.callState;

    if (status !== prevStatus.current) {
      stopSound();

      if (status === "ringing" && isIncoming) {
        playIncomingRing();
      } else if (status === "calling" && !isIncoming) {
        playDialingTone();
      }

      prevStatus.current = status;
    }
  }, [webrtc.callState.status, webrtc.callState.isIncoming, playIncomingRing, playDialingTone, stopSound]);

  return (
    <CallContext.Provider value={webrtc}>
      {children}
    </CallContext.Provider>
  );
}
