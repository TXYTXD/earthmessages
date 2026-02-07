import { useRef, useCallback } from "react";

// Generate a modern notification chime using Web Audio API
function createIncomingRingtone(ctx: AudioContext): OscillatorNode[] {
  const now = ctx.currentTime;
  const oscillators: OscillatorNode[] = [];

  // Google Meet-style rising three-note chime
  const playChime = (startTime: number) => {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 - major triad
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      const noteStart = startTime + i * 0.15;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.04);
      gain.gain.setValueAtTime(0.2, noteStart + 0.12);
      gain.gain.linearRampToValueAtTime(0, noteStart + 0.25);

      osc.connect(gain).connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + 0.3);
      oscillators.push(osc);
    });
  };

  // Repeat every 2.5 seconds for up to 30 seconds
  for (let i = 0; i < 12; i++) {
    playChime(now + i * 2.5);
  }

  return oscillators;
}

function createDialingTone(ctx: AudioContext): OscillatorNode[] {
  const now = ctx.currentTime;
  const oscillators: OscillatorNode[] = [];

  // Google Meet-style soft repeating double-beep
  const playBeep = (startTime: number) => {
    [0, 0.2].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 440;

      const t = startTime + offset;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
      gain.gain.setValueAtTime(0.12, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.15);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
      oscillators.push(osc);
    });
  };

  for (let i = 0; i < 10; i++) {
    playBeep(now + i * 3);
  }

  return oscillators;
}

export function useCallSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  const stopSound = useCallback(() => {
    oscillatorsRef.current.forEach((osc) => {
      try { osc.stop(); } catch {}
    });
    oscillatorsRef.current = [];
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
  }, []);

  const playIncomingRing = useCallback(() => {
    stopSound();
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    oscillatorsRef.current = createIncomingRingtone(ctx);
  }, [stopSound]);

  const playDialingTone = useCallback(() => {
    stopSound();
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    oscillatorsRef.current = createDialingTone(ctx);
  }, [stopSound]);

  return { playIncomingRing, playDialingTone, stopSound };
}
