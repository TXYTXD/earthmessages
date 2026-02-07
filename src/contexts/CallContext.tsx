import { createContext, useContext, ReactNode } from "react";
import { useWebRTC, type CallState } from "@/hooks/useWebRTC";

interface CallContextType {
  callState: CallState;
  isMuted: boolean;
  isVideoOff: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
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

  return (
    <CallContext.Provider value={webrtc}>
      {children}
    </CallContext.Provider>
  );
}
