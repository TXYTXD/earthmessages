import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "e8dd65b92c8bfc78d8de7f18",
    credential: "30YDVssHi/YUpxlY",
  },
  {
    urls: "turn:global.relay.metered.ca:80?transport=tcp",
    username: "e8dd65b92c8bfc78d8de7f18",
    credential: "30YDVssHi/YUpxlY",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "e8dd65b92c8bfc78d8de7f18",
    credential: "30YDVssHi/YUpxlY",
  },
  {
    urls: "turns:global.relay.metered.ca:443?transport=tcp",
    username: "e8dd65b92c8bfc78d8de7f18",
    credential: "30YDVssHi/YUpxlY",
  },
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
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval>>();
  const channelRef = useRef<any>(null);
  const callStateRef = useRef(callState);
  const startingCall = useRef(false); // Guard against double-clicks
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet = useRef(false);

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
    pendingCandidates.current = [];
    remoteDescSet.current = false;
    if (durationInterval.current) clearInterval(durationInterval.current);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    startingCall.current = false;
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
    setCallState((prev) => ({ ...prev, duration: 0 }));
    durationInterval.current = setInterval(() => {
      setCallState((prev) => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const setupPeerConnection = useCallback(
    (callId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 });
      peerConnection.current = pc;
      remoteDescSet.current = false;
      pendingCandidates.current = [];

      pc.onicecandidate = async (event) => {
        if (event.candidate && user) {
          try {
            await (supabase.from("call_signaling") as any).insert({
              call_id: callId,
              sender_id: user.id,
              type: "ice-candidate",
              payload: { candidate: event.candidate.toJSON() },
            });
          } catch (e) {
            console.warn("[Call] Failed to send ICE candidate:", e);
          }
        }
      };

      pc.ontrack = (event) => {
        console.log("[Call] ontrack received, streams:", event.streams.length);
        const stream = event.streams[0];
        remoteStream.current = stream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play().catch(() => {});
        }
        // Force a re-render so the overlay effect can pick up the stream
        setCallState((prev) => ({ ...prev }));
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[Call] ICE state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setCallState((prev) => {
            if (prev.status === "connected") return prev;
            startDurationTimer();
            return { ...prev, status: "connected" };
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[Call] Connection state:", pc.connectionState);
        if (pc.connectionState === "failed") {
          doHangUp();
        }
      };

      // Add local tracks
      localStream.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!);
      });

      return pc;
    },
    [user, doHangUp, startDurationTimer]
  );

  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc || !remoteDescSet.current) return;
    const queued = pendingCandidates.current.splice(0);
    for (const c of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn("[Call] Failed to add buffered ICE:", e);
      }
    }
  }, []);

  const subscribeToSignaling = useCallback(
    (callId: string) =>
      new Promise<void>((resolve) => {
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
                  remoteDescSet.current = true;
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  await (supabase.from("call_signaling") as any).insert({
                    call_id: callId,
                    sender_id: user!.id,
                    type: "answer",
                    payload: { sdp: answer },
                  });
                  await flushPendingCandidates();
                } else if (signal.type === "answer") {
                  await pc.setRemoteDescription(new RTCSessionDescription((signal.payload as any).sdp));
                  remoteDescSet.current = true;
                  await flushPendingCandidates();
                } else if (signal.type === "ice-candidate") {
                  const cand = (signal.payload as any).candidate;
                  if (!remoteDescSet.current) {
                    pendingCandidates.current.push(cand);
                  } else {
                    try {
                      await pc.addIceCandidate(new RTCIceCandidate(cand));
                    } catch (e) {
                      console.warn("[Call] Failed to add ICE candidate:", e);
                    }
                  }
                } else if (signal.type === "hangup") {
                  doHangUp();
                }
              } catch (e) {
                console.error("[Call] Signaling error:", e);
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
          .subscribe((status: string) => {
            console.log("[Call] Signaling channel status:", status);
            if (status === "SUBSCRIBED") resolve();
          });

        channelRef.current = channel;
      }),
    [user, cleanup, doHangUp, flushPendingCandidates]
  );

  const startCall = useCallback(
    async (receiverId: string, type: "voice" | "video") => {
      if (!user) {
        console.error("[Call] No user");
        toast({ title: "Not logged in", description: "Please log in to make calls", variant: "destructive" });
        return;
      }
      // Prevent duplicate calls
      if (startingCall.current || callStateRef.current.status !== "idle") {
        console.warn("[Call] Already in a call or starting one, status:", callStateRef.current.status, "starting:", startingCall.current);
        toast({ title: "Call in progress", description: "You're already in a call or starting one", variant: "destructive" });
        return;
      }
      startingCall.current = true;
      console.log("[Call] Starting", type, "call to", receiverId);

      // CRITICAL: getUserMedia must be called FIRST in the click handler
      // to preserve the user-gesture context for browser permission prompts
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
        }
      } catch (err) {
        console.error("[Call] Failed to get media devices:", err);
        toast({ title: "Media access denied", description: "Please allow microphone/camera access to make calls", variant: "destructive" });
        startingCall.current = false;
        return;
      }

      // Get receiver profile (after getUserMedia to preserve gesture context)
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", receiverId)
        .maybeSingle();

      const remoteName = profile?.display_name || "Unknown";

      // Create call record
      const { data: call, error } = await supabase
        .from("call_records")
        .insert({ caller_id: user.id, receiver_id: receiverId, type })
        .select()
        .single();

      console.log("[Call] Call record result:", { call, error });
      if (!call || error) {
        console.error("[Call] Failed to create call record:", error);
        toast({ title: "Call failed", description: error?.message || "Could not start call", variant: "destructive" });
        localStream.current?.getTracks().forEach((t) => t.stop());
        localStream.current = null;
        startingCall.current = false;
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

      // Subscribe to signaling and WAIT until the channel is ready before sending offer
      await subscribeToSignaling(call.id);

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

      const currentCall = callStateRef.current;

      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
        }
      } catch (err) {
        console.error("[Call] Failed to get media devices while answering:", err);
        toast({ title: "Media access denied", description: "Please allow microphone/camera access to answer calls", variant: "destructive" });
        await supabase.from("call_records").update({ status: "declined" }).eq("id", callId);
        cleanup();
        return;
      }

      setCallState((prev) => ({
        ...prev,
        callId,
        type,
        status: "calling",
        isIncoming: false,
        remoteName: prev.remoteName || currentCall.remoteName,
        remoteAvatar: prev.remoteAvatar || currentCall.remoteAvatar,
      }));

      const { error: updateError } = await supabase
        .from("call_records")
        .update({ status: "answered", started_at: new Date().toISOString() })
        .eq("id", callId);

      if (updateError) {
        console.error("[Call] Failed to mark call answered:", updateError);
        toast({ title: "Could not accept call", description: updateError.message, variant: "destructive" });
        cleanup();
        return;
      }

      const pc = setupPeerConnection(callId);

      // Subscribe and wait until the realtime channel is actually ready
      await subscribeToSignaling(callId);

      // Fetch existing signals (offer + ICE that arrived before subscribe)
      const { data: signals } = await supabase
        .from("call_signaling")
        .select("*")
        .eq("call_id", callId)
        .order("created_at", { ascending: true });

      if (!pc || !signals) return;

      const offerSignal = signals.find((s: any) => s.type === "offer" && s.sender_id !== user.id);
      const iceCandidates = signals.filter((s: any) => s.type === "ice-candidate" && s.sender_id !== user.id);

      if (!offerSignal) {
        console.warn("[Call] No offer found for callId", callId);
        toast({ title: "Could not connect", description: "The caller's connection offer was not found", variant: "destructive" });
        cleanup();
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription((offerSignal.payload as any).sdp));
        remoteDescSet.current = true;
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await (supabase.from("call_signaling") as any).insert({
          call_id: callId,
          sender_id: user.id,
          type: "answer",
          payload: { sdp: answer },
        });

        // Add the ICE candidates we already have, plus any that were buffered
        for (const signal of iceCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate((signal.payload as any).candidate));
          } catch (e) {
            console.warn("[Call] Failed to add ICE candidate:", e);
          }
        }
        await flushPendingCandidates();
      } catch (e) {
        console.error("[Call] Error processing offer:", e);
        toast({ title: "Could not connect", description: "There was a problem accepting the call", variant: "destructive" });
        cleanup();
      }
    },
    [user, setupPeerConnection, subscribeToSignaling, flushPendingCandidates, cleanup]
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

  // Handle an incoming call (shared between realtime and polling)
  const handleIncomingCall = useCallback(
    async (call: any) => {
      if (call.receiver_id !== user?.id) return;
      if (call.status !== "ringing") return;
      if (callStateRef.current.status !== "idle") {
        await supabase
          .from("call_records")
          .update({ status: "missed" })
          .eq("id", call.id);
        return;
      }

      console.log("[Call] Incoming call from:", call.caller_id, "id:", call.id);
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

      // Show browser notification if tab is not focused
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        try {
          const notification = new Notification(`Incoming ${call.type} call`, {
            body: `${remoteName} is calling you`,
            tag: `call-${call.id}`,
            requireInteraction: true,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (e) {
          console.warn("[Call] Failed to show notification:", e);
        }
      }
    },
    [user]
  );

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        console.log("[Call] Notification permission:", perm);
      });
    }
  }, []);

  // Listen for incoming calls via Realtime + Polling fallback
  useEffect(() => {
    if (!user) return;

    console.log("[Call] Setting up incoming call listener for user:", user.id);
    const seenCallIds = new Set<string>();

    // Realtime listener
    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_records",
        },
        async (payload: any) => {
          const call = payload.new;
          console.log("[Call] Realtime: received call_records INSERT:", call?.id);
          if (call && !seenCallIds.has(call.id)) {
            seenCallIds.add(call.id);
            handleIncomingCall(call);
          }
        }
      )
      .subscribe((status: string) => {
        console.log("[Call] Incoming calls channel status:", status);
      });

    // Polling fallback: check for ringing calls every 3 seconds
    const pollInterval = setInterval(async () => {
      if (callStateRef.current.status !== "idle") return;

      const { data: pendingCalls } = await supabase
        .from("call_records")
        .select("*")
        .eq("receiver_id", user.id)
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1);

      if (pendingCalls && pendingCalls.length > 0) {
        const call = pendingCalls[0];
        if (!seenCallIds.has(call.id)) {
          console.log("[Call] Polling: found ringing call:", call.id);
          seenCallIds.add(call.id);
          handleIncomingCall(call);
        }
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, handleIncomingCall]);

  return {
    callState,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    startCall,
    answerCall,
    declineCall,
    hangUp: doHangUp,
    toggleMute,
    toggleVideo,
  };
}
