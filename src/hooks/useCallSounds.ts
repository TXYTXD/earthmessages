import { useRef, useCallback } from "react";

// Generate a modern notification chime using Web Audio API
function createIncomingRingtone(ctx: AudioContext): OscillatorNode[] {
  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);
  gainNode.gain.setValueAtTime(0.3, now);

  const oscillators: OscillatorNode[] = [];

  // Modern two-tone chime pattern repeating
  const playChime = (startTime: number) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g1 = ctx.createGain();
    const g2 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.value = 880; // A5
    osc2.type = "sine";
    osc2.frequency.value = 1108.73; // C#6

    g1.gain.setValueAtTime(0, startTime);
    g1.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
    g1.gain.linearRampToValueAtTime(0, startTime + 0.4);

    g2.gain.setValueAtTime(0, startTime + 0.15);
    g2.gain.linearRampToValueAtTime(0.25, startTime + 0.2);
    g2.gain.linearRampToValueAtTime(0, startTime + 0.55);

    osc1.connect(g1).connect(ctx.destination);
    osc2.connect(g2).connect(ctx.destination);

    osc1.start(startTime);
    osc1.stop(startTime + 0.5);
    osc2.start(startTime + 0.15);
    osc2.stop(startTime + 0.6);

    oscillators.push(osc1, osc2);
  };

  // Repeat chime pattern every 2 seconds for up to 30 seconds
  for (let i = 0; i < 15; i++) {
    playChime(now + i * 2);
  }

  return oscillators;
}

function createDialingTone(ctx: AudioContext): OscillatorNode[] {
  const now = ctx.currentTime;
  const oscillators: OscillatorNode[] = [];

  // Soft pulsing tone (similar to phone dial tone but softer)
  const playPulse = (startTime: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 440; // A4

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
    gain.gain.setValueAtTime(0.15, startTime + 1.0);
    gain.gain.linearRampToValueAtTime(0, startTime + 1.1);

    osc.connect(gain).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 1.2);

    oscillators.push(osc);
  };

  // Repeat every 3 seconds for up to 30 seconds
  for (let i = 0; i < 10; i++) {
    playPulse(now + i * 3);
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
