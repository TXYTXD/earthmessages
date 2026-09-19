// Short interface sounds, generated live with Web Audio. No audio files are
// downloaded or hosted, so a theme can put a sound on anything without
// making the app heavier.

export const UI_SOUNDS = [
  { id: "none", label: "Silent", emoji: "—" },
  { id: "tap", label: "Tap", emoji: "👆" },
  { id: "pop", label: "Pop", emoji: "🫧" },
  { id: "click", label: "Click", emoji: "🖱️" },
  { id: "chime", label: "Chime", emoji: "🔔" },
  { id: "ding", label: "Ding", emoji: "🛎️" },
  { id: "blip", label: "Blip", emoji: "📟" },
  { id: "whoosh", label: "Whoosh", emoji: "💨" },
  { id: "swipe", label: "Swipe", emoji: "↔️" },
  { id: "bubble", label: "Bubble", emoji: "🐟" },
  { id: "knock", label: "Knock", emoji: "🚪" },
  { id: "coin", label: "Coin", emoji: "🪙" },
  { id: "laser", label: "Laser", emoji: "🔫" },
  { id: "drop", label: "Water drop", emoji: "💧" },
  { id: "typewriter", label: "Typewriter", emoji: "⌨️" },
  { id: "harp", label: "Harp", emoji: "🎼" },
  { id: "error", label: "Error", emoji: "⚠️" },
] as const;

export type UISoundName = (typeof UI_SOUNDS)[number]["id"];
const SOUND_SET = new Set<string>(UI_SOUNDS.map((s) => s.id));
export const isUISound = (v: unknown): v is UISoundName => typeof v === "string" && SOUND_SET.has(v);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  } catch {
    return null;
  }
  return ctx;
}

// Browsers only allow sound after a gesture; the first tap unlocks it.
export function unlockUISounds() {
  if (unlocked) return;
  const c = audio();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  unlocked = true;
}

export function setUISoundVolume(percent: number) {
  const c = audio();
  if (!c || !master) return;
  master.gain.setTargetAtTime(Math.min(100, Math.max(0, percent)) / 100 * 0.5, c.currentTime, 0.05);
}

interface ToneOpts {
  type?: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  gain?: number;
  delay?: number;
}

function tone(c: AudioContext, dest: AudioNode, o: ToneOpts) {
  const t0 = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.from, t0);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + o.dur);
  const peak = o.gain ?? 0.3;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.012, o.dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(dest);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.03);
}

function noise(c: AudioContext, dest: AudioNode, o: { dur: number; freq: number; q?: number; type?: BiquadFilterType; gain?: number; delay?: number }) {
  const t0 = c.currentTime + (o.delay ?? 0);
  const len = Math.max(1, Math.floor(c.sampleRate * o.dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  f.frequency.value = o.freq;
  if (o.q !== undefined) f.Q.value = o.q;
  const g = c.createGain();
  g.gain.value = o.gain ?? 0.3;
  src.connect(f).connect(g).connect(dest);
  src.start(t0);
}

// Play one interface sound. Safe to call often — it does nothing until the
// person has interacted with the page, and nothing at all for "none".
export function playUISound(name: UISoundName | undefined | null) {
  if (!name || name === "none" || !unlocked) return;
  const c = audio();
  if (!c || !master) return;
  if (c.state === "suspended") void c.resume();
  const d = master;

  switch (name) {
    case "tap": tone(c, d, { type: "sine", from: 700, to: 420, dur: 0.06, gain: 0.22 }); break;
    case "pop": tone(c, d, { type: "sine", from: 380, to: 900, dur: 0.09, gain: 0.3 }); break;
    case "click": noise(c, d, { dur: 0.04, freq: 2600, q: 3, gain: 0.28 }); break;
    case "chime":
      tone(c, d, { type: "sine", from: 880, dur: 0.35, gain: 0.2 });
      tone(c, d, { type: "sine", from: 1320, dur: 0.4, gain: 0.13, delay: 0.06 });
      break;
    case "ding": tone(c, d, { type: "triangle", from: 1500, dur: 0.45, gain: 0.22 }); break;
    case "blip": tone(c, d, { type: "square", from: 1200, to: 1600, dur: 0.05, gain: 0.14 }); break;
    case "whoosh": noise(c, d, { dur: 0.3, freq: 900, q: 0.6, type: "lowpass", gain: 0.3 }); break;
    case "swipe": noise(c, d, { dur: 0.18, freq: 1800, q: 1.2, gain: 0.24 }); break;
    case "bubble":
      tone(c, d, { type: "sine", from: 500, to: 1100, dur: 0.11, gain: 0.26 });
      tone(c, d, { type: "sine", from: 700, to: 1400, dur: 0.08, gain: 0.14, delay: 0.05 });
      break;
    case "knock": noise(c, d, { dur: 0.09, freq: 260, q: 1.6, gain: 0.4 }); break;
    case "coin":
      tone(c, d, { type: "square", from: 1050, dur: 0.07, gain: 0.16 });
      tone(c, d, { type: "square", from: 1570, dur: 0.22, gain: 0.14, delay: 0.06 });
      break;
    case "laser": tone(c, d, { type: "sawtooth", from: 1800, to: 220, dur: 0.22, gain: 0.16 }); break;
    case "drop": tone(c, d, { type: "sine", from: 1400, to: 320, dur: 0.16, gain: 0.26 }); break;
    case "typewriter":
      noise(c, d, { dur: 0.03, freq: 3200, q: 4, gain: 0.26 });
      noise(c, d, { dur: 0.05, freq: 900, q: 2, gain: 0.18, delay: 0.015 });
      break;
    case "harp":
      [660, 880, 1100].forEach((f, i) =>
        tone(c, d, { type: "triangle", from: f, dur: 0.5, gain: 0.12, delay: i * 0.05 })
      );
      break;
    case "error":
      tone(c, d, { type: "square", from: 300, dur: 0.12, gain: 0.18 });
      tone(c, d, { type: "square", from: 220, dur: 0.18, gain: 0.18, delay: 0.11 });
      break;
    default: break;
  }
}
