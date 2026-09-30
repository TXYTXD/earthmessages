import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchIceServers } from "@/hooks/useWebRTC";

// A meeting is a mesh: everyone holds a direct connection to everyone else.
// That is the right shape for a handful of people — nothing to run in the
// middle, and nobody's video passes through a server — but the cost grows
// with the square of the room, so it is capped rather than left to fall over.
export const MAX_IN_MEETING = 8;

// Presence is a heartbeat, because a browser cannot be relied on to say
// goodbye when a tab closes, a phone sleeps or a tunnel drops.
const HEARTBEAT_MS = 15_000;
const STALE_AFTER_MS = 45_000;

export interface Peer {
  userId: string;
  name: string;
  avatar: string;
  stream: MediaStream | null;
  /** They are here but their picture has not arrived yet */
  connecting: boolean;
}

export interface MeetingInfo {
  id: string;
  code: string;
  title: string;
  hostId: string;
  startsAt: string | null;
}

type Status = "joining" | "live" | "error" | "left";

interface SignalRow {
  id: string;
  meeting_id: string;
  sender_id: string;
  receiver_id: string;
  type: "offer" | "answer" | "ice-candidate" | "leave";
  payload: unknown;
}

interface PeerConn {
  pc: RTCPeerConnection;
  /** Candidates that arrived before the description they belong to */
  pending: RTCIceCandidateInit[];
  polite: boolean;
}

export function useMeetingRoom(code: string | undefined) {
  const { user } = useAuth();
  const me = user?.id ?? "";

  const [status, setStatus] = useState<Status>("joining");
  const [error, setError] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);

  const localStream = useRef<MediaStream | null>(null);
  const cameraTrack = useRef<MediaStreamTrack | null>(null);
  const conns = useRef<Map<string, PeerConn>>(new Map());
  const meetingId = useRef<string | null>(null);
  const iceServers = useRef<RTCIceServer[]>([]);
  const leaving = useRef(false);

  const [localReady, setLocalReady] = useState(false);
  const getLocalStream = useCallback(() => localStream.current, []);

  // ---------------------------------------------------------------- signals
  const send = useCallback(
    async (to: string, type: SignalRow["type"], payload: unknown) => {
      if (!meetingId.current) return;
      await supabase.from("meeting_signals").insert({
        meeting_id: meetingId.current,
        sender_id: me,
        receiver_id: to,
        type,
        payload: payload as never,
      });
    },
    [me]
  );

  // Who offers and who answers, decided the same way on both sides so the
  // two never talk over each other. No negotiation about negotiating.
  const iAmCaller = useCallback((them: string) => me > them, [me]);

  const dropPeer = useCallback((userId: string) => {
    const c = conns.current.get(userId);
    if (c) {
      try { c.pc.close(); } catch { /* already closed */ }
      conns.current.delete(userId);
    }
    setPeers((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const ensureConn = useCallback(
    (them: string): PeerConn => {
      const existing = conns.current.get(them);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: iceServers.current, iceCandidatePoolSize: 4 });
      const entry: PeerConn = { pc, pending: [], polite: !iAmCaller(them) };
      conns.current.set(them, entry);

      localStream.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) void send(them, "ice-candidate", e.candidate.toJSON());
      };

      pc.ontrack = (e) => {
        const [stream] = e.streams;
        setPeers((prev) => ({
          ...prev,
          [them]: {
            ...(prev[them] ?? { userId: them, name: "", avatar: "", stream: null, connecting: true }),
            stream,
            connecting: false,
          },
        }));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          // A mesh leg can fail on its own without the room being broken.
          // Tear that one down; their heartbeat will bring it back.
          console.warn("[Meeting] connection to", them, "failed");
          dropPeer(them);
        }
      };

      return entry;
    },
    [iAmCaller, send, dropPeer]
  );

  const callPeer = useCallback(
    async (them: string) => {
      const { pc } = ensureConn(them);
      if (!iAmCaller(them)) return;
      if (pc.signalingState !== "stable") return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await send(them, "offer", offer);
    },
    [ensureConn, iAmCaller, send]
  );

  const handleSignal = useCallback(
    async (row: SignalRow) => {
      const them = row.sender_id;
      if (them === me) return;

      if (row.type === "leave") {
        dropPeer(them);
        return;
      }

      const entry = ensureConn(them);
      const { pc } = entry;

      try {
        if (row.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(row.payload as RTCSessionDescriptionInit));
          for (const c of entry.pending.splice(0)) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await send(them, "answer", answer);
        } else if (row.type === "answer") {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(row.payload as RTCSessionDescriptionInit));
            for (const c of entry.pending.splice(0)) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
          }
        } else if (row.type === "ice-candidate") {
          const cand = row.payload as RTCIceCandidateInit;
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } else {
            entry.pending.push(cand);
          }
        }
      } catch (e) {
        console.error("[Meeting] signal failed", row.type, e);
      }
    },
    [me, ensureConn, send, dropPeer]
  );

  // ------------------------------------------------------------------ join
  useEffect(() => {
    if (!code || !me) return;
    let cancelled = false;
    leaving.current = false;

    const run = async () => {
      setStatus("joining");
      setError(null);

      // The camera is asked for first, while the click that led here is still
      // recent — Safari will refuse the prompt otherwise.
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        cameraTrack.current = localStream.current.getVideoTracks()[0] ?? null;
        setLocalReady(true);
      } catch {
        // No camera is not a reason to be shut out — audio only, or listening.
        try {
          localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
          cameraTrack.current = null;
          setCameraOn(false);
          setLocalReady(true);
        } catch {
          localStream.current = null;
          setCameraOn(false);
          setMicOn(false);
        }
      }
      if (cancelled) return;

      const { data, error: joinError } = await supabase.rpc("join_meeting", { p_code: code });
      if (cancelled) return;
      if (joinError || !data) {
        setError(joinError?.message ?? "That meeting could not be found.");
        setStatus("error");
        return;
      }

      const row = data as unknown as {
        id: string; code: string; title: string; host_id: string; starts_at: string | null;
      };
      meetingId.current = row.id;
      setMeeting({ id: row.id, code: row.code, title: row.title, hostId: row.host_id, startsAt: row.starts_at });

      iceServers.current = await fetchIceServers();
      if (cancelled) return;

      // Everyone already in the room, minus the ones who have gone quiet.
      const fresh = new Date(Date.now() - STALE_AFTER_MS).toISOString();
      const { data: present } = await supabase
        .from("meeting_participants")
        .select("user_id, last_seen, left_at")
        .eq("meeting_id", row.id)
        .is("left_at", null)
        .gte("last_seen", fresh);

      const others = (present ?? []).map((p) => p.user_id as string).filter((id) => id !== me);
      if (others.length + 1 > MAX_IN_MEETING) {
        // The row went in before we could count, so take it back out.
        await supabase
          .from("meeting_participants")
          .update({ left_at: new Date().toISOString() })
          .eq("meeting_id", row.id)
          .eq("user_id", me);
        localStream.current?.getTracks().forEach((t) => t.stop());
        localStream.current = null;
        setError(`This meeting is full — it holds ${MAX_IN_MEETING} people.`);
        setStatus("error");
        return;
      }

      setStatus("live");
      for (const them of others) {
        setPeers((prev) => ({
          ...prev,
          [them]: prev[them] ?? { userId: them, name: "", avatar: "", stream: null, connecting: true },
        }));
        void callPeer(them);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, me]);

  // ------------------------------------------------------------- listening
  useEffect(() => {
    if (status !== "live" || !meetingId.current || !me) return;
    const id = meetingId.current;

    const channel = supabase
      .channel(`meeting:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "meeting_signals", filter: `receiver_id=eq.${me}` },
        (payload) => {
          const row = payload.new as SignalRow;
          if (row.meeting_id !== id) return;
          void handleSignal(row);
          // Nothing needs a signal once it has been acted on.
          void supabase.from("meeting_signals").delete().eq("id", row.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_participants", filter: `meeting_id=eq.${id}` },
        (payload) => {
          const row = payload.new as { user_id?: string; left_at?: string | null } | null;
          if (!row?.user_id || row.user_id === me) return;
          if (row.left_at) {
            dropPeer(row.user_id);
            return;
          }
          setPeers((prev) =>
            prev[row.user_id!]
              ? prev
              : { ...prev, [row.user_id!]: { userId: row.user_id!, name: "", avatar: "", stream: null, connecting: true } }
          );
          // Only one side opens the connection, and both sides agree which.
          void callPeer(row.user_id);
        }
      )
      .subscribe();

    // Someone already in the room may have sent their offer in the moment
    // between us joining and us listening. Those rows are sitting in the
    // table; without this they would simply never be seen and that person
    // would stay a grey square.
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("meeting_signals")
        .select("*")
        .eq("meeting_id", id)
        .eq("receiver_id", me)
        .order("created_at", { ascending: true });
      if (cancelled || !data?.length) return;
      for (const row of data as unknown as SignalRow[]) {
        await handleSignal(row);
      }
      await supabase.from("meeting_signals").delete().in("id", data.map((r) => r.id as string));
    })();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [status, me, handleSignal, callPeer, dropPeer]);

  // ------------------------------------------------------------- heartbeat
  useEffect(() => {
    if (status !== "live" || !meetingId.current || !me) return;
    const id = meetingId.current;
    const beat = () => {
      void supabase
        .from("meeting_participants")
        .update({ last_seen: new Date().toISOString() })
        .eq("meeting_id", id)
        .eq("user_id", me);
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [status, me]);

  // Read by the sweep below without putting `peers` in its dependency list,
  // which would restart the timer every time a frame of video arrives.
  const peersRef = useRef(peers);
  useEffect(() => { peersRef.current = peers; }, [peers]);

  // Drop anyone whose heartbeat stopped, so a crashed tab does not leave a
  // black rectangle in the grid forever.
  useEffect(() => {
    if (status !== "live" || !meetingId.current) return;
    const id = meetingId.current;
    const sweep = async () => {
      const fresh = new Date(Date.now() - STALE_AFTER_MS).toISOString();
      const { data } = await supabase
        .from("meeting_participants")
        .select("user_id, last_seen, left_at")
        .eq("meeting_id", id)
        .is("left_at", null)
        .gte("last_seen", fresh);
      const alive = new Set((data ?? []).map((p) => p.user_id as string));
      for (const userId of Object.keys(peersRef.current)) {
        if (!alive.has(userId)) dropPeer(userId);
      }
    };
    const timer = setInterval(sweep, STALE_AFTER_MS);
    return () => clearInterval(timer);
  }, [status, dropPeer]);

  // ------------------------------------------------------------------ names
  useEffect(() => {
    const unknown = Object.values(peers).filter((p) => !p.name).map((p) => p.userId);
    if (unknown.length === 0) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", unknown);
      if (cancelled || !data) return;
      setPeers((prev) => {
        const next = { ...prev };
        for (const p of data) {
          const cur = next[p.id as string];
          if (!cur) continue;
          next[p.id as string] = {
            ...cur,
            name: (p.display_name as string) || "Someone",
            avatar: ((p.display_name as string) || "?").slice(0, 2).toUpperCase(),
          };
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [peers]);

  // ----------------------------------------------------------- the controls
  const toggleMic = useCallback(() => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStream.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  }, []);

  const toggleShare = useCallback(async () => {
    const swapInto = (track: MediaStreamTrack | null) => {
      conns.current.forEach(({ pc }) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && track) void sender.replaceTrack(track);
      });
    };

    if (sharing) {
      swapInto(cameraTrack.current);
      setSharing(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      if (!track) return;
      // Stopping the share from the browser's own bar must put the camera back.
      track.onended = () => { swapInto(cameraTrack.current); setSharing(false); };
      swapInto(track);
      setSharing(true);
    } catch {
      /* the person changed their mind at the picker */
    }
  }, [sharing]);

  const leave = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    const id = meetingId.current;

    for (const them of Array.from(conns.current.keys())) {
      void send(them, "leave", {});
    }
    conns.current.forEach(({ pc }) => { try { pc.close(); } catch { /* closed */ } });
    conns.current.clear();
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;

    if (id && me) {
      await supabase
        .from("meeting_participants")
        .update({ left_at: new Date().toISOString() })
        .eq("meeting_id", id)
        .eq("user_id", me);
    }
    setPeers({});
    setStatus("left");
  }, [me, send]);

  // Closing the tab should look the same to everyone else as pressing Leave.
  useEffect(() => {
    const onUnload = () => {
      const id = meetingId.current;
      if (!id || !me) return;
      conns.current.forEach(({ pc }) => { try { pc.close(); } catch { /* closed */ } });
      localStream.current?.getTracks().forEach((t) => t.stop());
    };
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      onUnload();
    };
  }, [me]);

  return {
    status,
    error,
    meeting,
    peers: Object.values(peers),
    localReady,
    getLocalStream,
    micOn,
    cameraOn,
    sharing,
    toggleMic,
    toggleCamera,
    toggleShare,
    leave,
    isHost: !!meeting && meeting.hostId === me,
  };
}
