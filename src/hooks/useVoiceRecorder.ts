import { useState, useRef, useCallback, useEffect } from "react";

// Pick a recording format the current browser supports (Safari can't do
// webm — it records audio/mp4 instead; both play fine in <audio>).
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const cancelledRef = useRef(false);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = useCallback(async (): Promise<boolean> => {
    if (recorderRef.current) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(250);
      recorderRef.current = rec;
      setSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setRecording(true);
      return true;
    } catch (e) {
      console.warn("[Voice] Could not start recording:", e);
      stopTracks();
      return false;
    }
  }, []);

  // Stop recording and get the finished audio file (null if cancelled/empty)
  const stop = useCallback(
    (): Promise<File | null> =>
      new Promise((resolve) => {
        const rec = recorderRef.current;
        recorderRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        if (!rec) {
          resolve(null);
          return;
        }
        rec.onstop = () => {
          stopTracks();
          if (cancelledRef.current || chunksRef.current.length === 0) {
            resolve(null);
            return;
          }
          const type = rec.mimeType || "audio/webm";
          const ext = type.includes("mp4") ? "m4a" : "webm";
          const blob = new Blob(chunksRef.current, { type });
          resolve(new File([blob], `voice-message-${Date.now()}.${ext}`, { type }));
        };
        try {
          rec.stop();
        } catch {
          stopTracks();
          resolve(null);
        }
      }),
    []
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    void stop();
  }, [stop]);

  // Never leave the mic on if the component unmounts mid-recording
  useEffect(
    () => () => {
      cancelledRef.current = true;
      try {
        recorderRef.current?.stop();
      } catch {
        /* already stopped */
      }
      if (timerRef.current) clearInterval(timerRef.current);
      stopTracks();
    },
    []
  );

  return { recording, seconds, start, stop, cancel };
}
