import { useRef, useCallback } from "react";

// Marimba-style ringtone melody using Web Audio API with looping —
// a warm plucked arpeggio with a soft echo, closer to a real phone
// ringtone than the previous three-note chime.
function createRingtonePlayer(ctx: AudioContext): { stop: () => void } {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // One marimba-like pluck: fundamental + a quieter octave partial,
  // fast attack and a natural exponential decay.
  const pluck = (freq: number, t: number, vol: number) => {
    [1, 2].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * mult;
      const v = vol * (i === 0 ? 1 : 0.35);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  };

  const playPhrase = () => {
    if (stopped) return;
    const now = ctx.currentTime + 0.05;
    // D5 F#5 A5 D6 rise, answered by A5 F#5 — bright and friendly
    const D5 = 587.33, Fs5 = 739.99, A5 = 880.0, D6 = 1174.66;
    const melody: Array<[number, number]> = [
      [0.0, D5], [0.13, Fs5], [0.26, A5], [0.39, D6],
      [0.65, A5], [0.78, Fs5],
    ];
    melody.forEach(([dt, f]) => pluck(f, now + dt, 0.3));
    // Soft echo of the phrase
    melody.forEach(([dt, f]) => pluck(f, now + dt + 1.05, 0.12));

    // Repeat like a real ring cadence
    timeoutId = setTimeout(() => playPhrase(), 2600);
  };

  playPhrase();

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
  const vibrateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSound = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    if (vibrateRef.current) {
      clearInterval(vibrateRef.current);
      vibrateRef.current = null;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);
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
    // Vibrate like a real phone call (Android; iPhones ignore this)
    if ("vibrate" in navigator) {
      const buzz = () => navigator.vibrate([450, 250, 450, 1450]);
      buzz();
      vibrateRef.current = setInterval(buzz, 2600);
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
