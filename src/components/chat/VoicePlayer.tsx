import { useEffect, useRef, useState } from "react";
import { Play, Pause, AlertCircle } from "lucide-react";

interface VoicePlayerProps {
  src: string;
  // Duration in seconds from message metadata — webm recordings don't carry
  // duration in the file itself, so the metadata value is the reliable one.
  duration?: number;
}

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
};

// Decorative waveform bars (deterministic pattern so it doesn't flicker)
const BARS = [5, 9, 13, 8, 11, 15, 10, 6, 12, 16, 9, 13, 7, 11, 14, 8, 12, 6, 10, 13, 9, 5];

export function VoicePlayer({ src, duration }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration && duration > 0 ? duration : 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => {
      if (isFinite(el.duration) && el.duration > 0) setTotal(el.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onError = () => setFailed(true);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    el.addEventListener("ended", onEnded);
    el.addEventListener("pause", onPause);
    el.addEventListener("play", onPlay);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("error", onError);
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || failed) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => setFailed(true));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !total || failed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    try {
      el.currentTime = frac * total;
      setCurrent(frac * total);
    } catch {
      /* not seekable yet */
    }
  };

  if (failed) {
    return (
      <div className="flex items-center gap-2 py-1 min-w-[190px]">
        <AlertCircle className="w-4 h-4 opacity-70 flex-shrink-0" />
        <span className="text-[13px] opacity-80">Can't play this voice message on this device</span>
      </div>
    );
  }

  const progress = total > 0 ? Math.min(1, current / total) : 0;

  return (
    <div className="flex items-center gap-2.5 py-0.5 min-w-[190px] max-w-[240px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-black/15 dark:bg-white/15 hover:bg-black/25 dark:hover:bg-white/25 flex items-center justify-center flex-shrink-0 transition-colors"
        title={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 cursor-pointer select-none" onClick={seek}>
        <div className="flex items-center gap-[2px] h-6">
          {BARS.map((h, i) => {
            const done = (i + 0.5) / BARS.length <= progress;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-opacity ${done ? "opacity-95" : "opacity-35"}`}
                style={{ height: `${h}px`, backgroundColor: "currentColor", minWidth: 2 }}
              />
            );
          })}
        </div>
      </div>

      <span className="text-[11px] tabular-nums opacity-80 flex-shrink-0">
        {playing || current > 0 ? fmt(current) : fmt(total)}
      </span>
    </div>
  );
}
