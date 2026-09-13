import { useEffect, useRef } from "react";
import type { AmbientSound } from "@/lib/themeEffects";

// Ambient background sound, generated live with Web Audio — no audio files
// are downloaded or hosted. Browsers only allow sound after the person has
// interacted with the page, so we wait for the first tap or key press.

interface Voice {
  stop: () => void;
}

function noiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Brown-ish noise: softer and less hissy than white noise
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
}

function makeNoise(ctx: AudioContext, dest: AudioNode, opts: { type: BiquadFilterType; freq: number; q?: number; gain: number }): Voice {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = opts.type;
  filter.frequency.value = opts.freq;
  if (opts.q !== undefined) filter.Q.value = opts.q;
  const gain = ctx.createGain();
  gain.gain.value = opts.gain;
  src.connect(filter).connect(gain).connect(dest);
  src.start();
  return { stop: () => { try { src.stop(); } catch { /* already stopped */ } src.disconnect(); filter.disconnect(); gain.disconnect(); } };
}

// Slowly moves a parameter up and down, the way real ambience breathes
function makeSwell(ctx: AudioContext, target: AudioParam, base: number, depth: number, rate: number): Voice {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const amp = ctx.createGain();
  amp.gain.value = depth;
  target.value = base;
  lfo.connect(amp).connect(target);
  lfo.start();
  return { stop: () => { try { lfo.stop(); } catch { /* already stopped */ } lfo.disconnect(); amp.disconnect(); } };
}

function buildScene(ctx: AudioContext, dest: AudioNode, sound: AmbientSound): Voice[] {
  const voices: Voice[] = [];
  switch (sound) {
    case "rain": {
      const patter = makeNoise(ctx, dest, { type: "highpass", freq: 1100, gain: 0.5 });
      const body = makeNoise(ctx, dest, { type: "lowpass", freq: 700, gain: 0.35 });
      voices.push(patter, body);
      break;
    }
    case "waves": {
      const surf = ctx.createBufferSource();
      surf.buffer = noiseBuffer(ctx, 6);
      surf.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 520;
      const gain = ctx.createGain();
      surf.connect(filter).connect(gain).connect(dest);
      surf.start();
      voices.push({ stop: () => { try { surf.stop(); } catch { /* already stopped */ } surf.disconnect(); filter.disconnect(); gain.disconnect(); } });
      // the swell of each wave rolling in
      voices.push(makeSwell(ctx, gain.gain, 0.32, 0.26, 0.09));
      voices.push(makeSwell(ctx, filter.frequency, 520, 300, 0.07));
      break;
    }
    case "forest": {
      const leaves = makeNoise(ctx, dest, { type: "bandpass", freq: 2400, q: 0.7, gain: 0.22 });
      const air = makeNoise(ctx, dest, { type: "lowpass", freq: 400, gain: 0.18 });
      voices.push(leaves, air);
      break;
    }
    case "fire": {
      const crackle = makeNoise(ctx, dest, { type: "bandpass", freq: 1600, q: 1.2, gain: 0.2 });
      const roar = makeNoise(ctx, dest, { type: "lowpass", freq: 320, gain: 0.4 });
      voices.push(crackle, roar);
      break;
    }
    case "space": {
      const hum = makeNoise(ctx, dest, { type: "lowpass", freq: 180, gain: 0.5 });
      voices.push(hum);
      const drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.value = 55;
      const dg = ctx.createGain();
      dg.gain.value = 0.05;
      drone.connect(dg).connect(dest);
      drone.start();
      voices.push({ stop: () => { try { drone.stop(); } catch { /* already stopped */ } drone.disconnect(); dg.disconnect(); } });
      break;
    }
    case "cafe": {
      const murmur = makeNoise(ctx, dest, { type: "bandpass", freq: 500, q: 0.5, gain: 0.35 });
      const room = makeNoise(ctx, dest, { type: "lowpass", freq: 900, gain: 0.18 });
      voices.push(murmur, room);
      break;
    }
    case "wind": {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 5);
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 0.9;
      const gain = ctx.createGain();
      gain.gain.value = 0.4;
      src.connect(filter).connect(gain).connect(dest);
      src.start();
      voices.push({ stop: () => { try { src.stop(); } catch { /* already stopped */ } src.disconnect(); filter.disconnect(); gain.disconnect(); } });
      voices.push(makeSwell(ctx, filter.frequency, 700, 420, 0.05));
      break;
    }
    default:
      break;
  }
  return voices;
}

export function useAmbientSound(sound: AmbientSound, volume: number, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const voicesRef = useRef<Voice[]>([]);

  // Build (or tear down) the scene
  useEffect(() => {
    const wanted = enabled && sound !== "none" && volume > 0;

    const teardown = () => {
      voicesRef.current.forEach((v) => v.stop());
      voicesRef.current = [];
    };

    if (!wanted) {
      teardown();
      return;
    }

    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      try {
        if (!ctxRef.current) {
          const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!Ctor) return;
          ctxRef.current = new Ctor();
          const master = ctxRef.current.createGain();
          master.gain.value = 0;
          master.connect(ctxRef.current.destination);
          masterRef.current = master;
        }
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        teardown();
        voicesRef.current = buildScene(ctx, masterRef.current!, sound);
        // fade in so it never starts abruptly
        const master = masterRef.current!;
        const target = (volume / 100) * 0.25; // ambience stays well under app sounds
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.6);
      } catch (e) {
        console.warn("[Ambience] could not start:", e);
      }
    };

    // Browsers require a gesture before audio can play
    const ctx = ctxRef.current;
    if (ctx && ctx.state === "running") {
      start();
    } else {
      const once = () => {
        window.removeEventListener("pointerdown", once);
        window.removeEventListener("keydown", once);
        start();
      };
      window.addEventListener("pointerdown", once, { once: true });
      window.addEventListener("keydown", once, { once: true });
      return () => {
        cancelled = true;
        window.removeEventListener("pointerdown", once);
        window.removeEventListener("keydown", once);
        teardown();
      };
    }

    return () => {
      cancelled = true;
      teardown();
    };
  }, [sound, enabled, volume > 0]);

  // Volume changes without rebuilding the scene
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const target = enabled && sound !== "none" ? (volume / 100) * 0.25 : 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.4);
  }, [volume, enabled, sound]);

  // Pause while the tab is in the background so it never plays unheard
  useEffect(() => {
    const onVisibility = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else if (enabled && sound !== "none") void ctx.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled, sound]);

  useEffect(() => {
    return () => {
      voicesRef.current.forEach((v) => v.stop());
      voicesRef.current = [];
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      masterRef.current = null;
    };
  }, []);
}
