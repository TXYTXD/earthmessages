import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface CallState {
  callId: string | null;
  status: "idle" | "calling" | "ringing" | "connected" | "ended";
  type: "voice" | "video";
  remoteName: string;
  remoteAvatar: string;
  isIncoming: boolean;
  duration: number;
}

export function useWebRTC() {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    status: "idle",
    type: "voice",
    remoteName: "",
    remoteAvatar: "",
    isIncoming: false,
    duration: 0,
  });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval>>();
  const channelRef = useRef<any>(null);
  const callStateRef = useRef(callState);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Keep ref in sync so callbacks always have latest state
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const cleanup = useCallback(() => {
    peerConnection.current?.close();
    peerConnection.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    remoteStream.current = null;
    if (durationInterval.current) clearInterval(durationInterval.current);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setCallState({
      callId: null,
      status: "idle",
      type: "voice",
      remoteName: "",
      remoteAvatar: "",
      isIncoming: false,
      duration: 0,
    });
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const doHangUp = useCallback(async () => {
    const current = callStateRef.current;
    if (current.callId && user) {
      await (supabase.from("call_signaling") as any).insert({
        call_id: current.callId,
        sender_id: user.id,
        type: "hangup",
        payload: {},
      });
      await supabase
        .from("call_records")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", current.callId);
    }
    cleanup();
  }, [user, cleanup]);

  const startDurationTimer = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = setInterval(() => {
      setCallState((prev) => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const setupPeerConnection = useCallback(
    (callId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnection.current = pc;

      pc.onicecandidate = async (event) => {
        if (event.candidate && user) {
          await (supabase.from("call_signaling") as any).insert({
            call_id: callId,
            sender_id: user.id,
            type: "ice-candidate",
            payload: { candidate: event.candidate.toJSON() },
          });
        }
      };

      pc.ontrack = (event) => {
        remoteStream.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          doHangUp();
        }
      };

      // Add local tracks
      localStream.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!);
      });

      return pc;
    },
    [user, doHangUp]
  );

  const subscribeToSignaling = useCallback(
    (callId: string) => {
      const channel = supabase
        .channel(`call:${callId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_signaling",
            filter: `call_id=eq.${callId}`,
          },
          async (payload: any) => {
            const signal = payload.new;
            if (signal.sender_id === user?.id) return;

            const pc = peerConnection.current;
            if (!pc) return;

            try {
              if (signal.type === "offer") {
                await pc.setRemoteDescription(new RTCSessionDescription((signal.payload as any).sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await (supabase.from("call_signaling") as any).insert({
                  call_id: callId,
                  sender_id: user!.id,
                  type: "answer",
                  payload: { sdp: answer },
                });
              } else if (signal.type === "answer") {
                await pc.setRemoteDescription(new RTCSessionDescription((signal.payload as any).sdp));
                setCallState((prev) => ({ ...prev, status: "connected" }));
                startDurationTimer();
              } else if (signal.type === "ice-candidate") {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate((signal.payload as any).candidate));
                } catch (e) {
                  console.warn("Failed to add ICE candidate:", e);
                }
              } else if (signal.type === "hangup") {
                doHangUp();
              }
            } catch (e) {
              console.error("Signaling error:", e);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "call_records",
            filter: `id=eq.${callId}`,
          },
          (payload: any) => {
            const record = payload.new;
            if (record.status === "declined" || record.status === "missed") {
              cleanup();
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
      return channel;
    },
    [user, cleanup, doHangUp, startDurationTimer]
  );

  const startCall = useCallback(
    async (receiverId: string, type: "voice" | "video") => {
      if (!user) return;

      // Get receiver profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", receiverId)
        .maybeSingle();

      const remoteName = profile?.display_name || "Unknown";

      // Get media
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
        }
      } catch {
        console.error("Failed to get media devices");
        return;
      }

      // Create call record
      const { data: call, error } = await supabase
        .from("call_records")
        .insert({ caller_id: user.id, receiver_id: receiverId, type })
        .select()
        .single();

      if (!call || error) {
        console.error("Failed to create call record:", error);
        localStream.current?.getTracks().forEach((t) => t.stop());
        localStream.current = null;
        return;
      }

      setCallState({
        callId: call.id,
        status: "calling",
        type,
        remoteName,
        remoteAvatar: (remoteName || "?").slice(0, 2).toUpperCase(),
        isIncoming: false,
        duration: 0,
      });

      const pc = setupPeerConnection(call.id);

      // Subscribe to signaling FIRST, then send offer
      // This prevents missing the answer due to race condition
      const channel = subscribeToSignaling(call.id);

      // Wait a moment for the channel to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await (supabase.from("call_signaling") as any).insert({
        call_id: call.id,
        sender_id: user.id,
        type: "offer",
        payload: { sdp: offer },
      });
    },
    [user, setupPeerConnection, subscribeToSignaling]
  );

  const answerCall = useCallback(
    async (callId: string, type: "voice" | "video") => {
      if (!user) return;

      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
        }
      } catch {
        console.error("Failed to get media devices");
        return;
      }

      await supabase
        .from("call_records")
        .update({ status: "answered", started_at: new Date().toISOString() })
        .eq("id", callId);

      const pc = setupPeerConnection(callId);
      subscribeToSignaling(callId);

      // Wait a moment for the channel to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch existing signals (offer + ICE candidates)
      const { data: signals } = await supabase
        .from("call_signaling")
        .select("*")
        .eq("call_id", callId)
        .order("created_at", { ascending: true });

      if (!pc || !signals) return;

      // Process offer first, then ICE candidates
      const offerSignal = signals.find((s: any) => s.type === "offer" && s.sender_id !== user.id);
      const iceCandidates = signals.filter((s: any) => s.type === "ice-candidate" && s.sender_id !== user.id);

      if (offerSignal) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription((offerSignal.payload as any).sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await (supabase.from("call_signaling") as any).insert({
            call_id: callId,
            sender_id: user.id,
            type: "answer",
            payload: { sdp: answer },
          });

          // Add ICE candidates after setting remote description
          for (const signal of iceCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate((signal.payload as any).candidate));
            } catch (e) {
              console.warn("Failed to add ICE candidate:", e);
            }
          }

          setCallState((prev) => ({ ...prev, status: "connected" }));
          startDurationTimer();
        } catch (e) {
          console.error("Error processing offer:", e);
        }
      }
    },
    [user, setupPeerConnection, subscribeToSignaling, startDurationTimer]
  );

  const declineCall = useCallback(
    async (callId: string) => {
      await supabase
        .from("call_records")
        .update({ status: "declined" })
        .eq("id", callId);
      cleanup();
    },
    [cleanup]
  );

  const toggleMute = useCallback(() => {
    localStream.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    localStream.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoOff((prev) => !prev);
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_records",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const call = payload.new;
          if (call.status !== "ringing") return;
          if (callStateRef.current.status !== "idle") {
            // Already in a call, auto-decline
            await supabase
              .from("call_records")
              .update({ status: "missed" })
              .eq("id", call.id);
            return;
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", call.caller_id)
            .maybeSingle();

          const remoteName = profile?.display_name || "Unknown";

          setCallState({
            callId: call.id,
            status: "ringing",
            type: call.type,
            remoteName,
            remoteAvatar: (remoteName || "?").slice(0, 2).toUpperCase(),
            isIncoming: true,
            duration: 0,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    callState,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    declineCall,
    hangUp: doHangUp,
    toggleMute,
    toggleVideo,
  };
}
