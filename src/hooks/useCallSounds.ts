import { useRef, useCallback } from "react";

// Google Meet-style ringtone using Web Audio API with looping
function createRingtonePlayer(ctx: AudioContext): { stop: () => void } {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const playChime = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 - major triad

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      const noteStart = now + i * 0.15;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.05);
      gain.gain.setValueAtTime(0.25, noteStart + 0.15);
      gain.gain.linearRampToValueAtTime(0, noteStart + 0.3);

      osc.connect(gain).connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + 0.35);
    });

    // Repeat every 2 seconds
    timeoutId = setTimeout(() => playChime(), 2000);
  };

  playChime();

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

function createDialingPlayer(ctx: AudioContext): { stop: () => void } {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const playBeep = () => {
    if (stopped) return;
    const now = ctx.currentTime;

    [0, 0.25].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 440;

      const t = now + offset;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
      gain.gain.setValueAtTime(0.15, t + 0.12);
      gain.gain.linearRampToValueAtTime(0, t + 0.18);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });

    timeoutId = setTimeout(() => playBeep(), 3000);
  };

  playBeep();

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

export function useCallSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<{ stop: () => void } | null>(null);

  const stopSound = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
  }, []);

  const playIncomingRing = useCallback(() => {
    stopSound();
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      playerRef.current = createRingtonePlayer(ctx);
    } catch (e) {
      console.warn("[CallSounds] Failed to play incoming ring:", e);
    }
  }, [stopSound]);

  const playDialingTone = useCallback(() => {
    stopSound();
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      playerRef.current = createDialingPlayer(ctx);
    } catch (e) {
      console.warn("[CallSounds] Failed to play dialing tone:", e);
    }
  }, [stopSound]);

  return { playIncomingRing, playDialingTone, stopSound };
}
