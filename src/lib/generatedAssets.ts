// Sounds and animations a theme can invent, rather than pick from a list.
//
// Both are described as plain numbers, never as code or CSS text. That keeps
// them safe to share: a theme from someone else can only ask for a tone at a
// frequency or a keyframe at a scale, so there is nothing to inject.

// ---- Sounds ---------------------------------------------------------------
export type Waveform = "sine" | "square" | "sawtooth" | "triangle";
export type FilterKind = "lowpass" | "highpass" | "bandpass";

export interface SoundLayer {
  /** A pitched tone, or a burst of noise (for clicks, whooshes, rain) */
  type: "tone" | "noise";
  wave?: Waveform;
  /** Starting frequency in Hz */
  from: number;
  /** Optional glide to another frequency */
  to?: number;
  /** Seconds */
  duration: number;
  /** 0..1 */
  gain: number;
  /** Seconds to wait before this layer starts */
  delay?: number;
  filter?: FilterKind;
  q?: number;
}

export interface GeneratedSound {
  name: string;
  layers: SoundLayer[];
}

const WAVES = new Set<string>(["sine", "square", "sawtooth", "triangle"]);
const FILTERS = new Set<string>(["lowpass", "highpass", "bandpass"]);

const num = (v: unknown, min: number, max: number, fallback?: number): number | undefined => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : undefined;
  if (n === undefined) return fallback;
  return Math.min(max, Math.max(min, n));
};

export const MAX_SOUND_LAYERS = 4;
export const MAX_SOUND_SECONDS = 1.5;

export function normalizeSound(raw: unknown): GeneratedSound | null {
  const s = raw as GeneratedSound;
  if (!s || typeof s !== "object" || !Array.isArray(s.layers)) return null;
  const layers: SoundLayer[] = [];
  for (const entry of s.layers.slice(0, MAX_SOUND_LAYERS)) {
    const l = entry as SoundLayer;
    if (!l || typeof l !== "object") continue;
    const type = l.type === "noise" ? "noise" : "tone";
    const from = num(l.from, 20, 12000);
    const duration = num(l.duration, 0.01, MAX_SOUND_SECONDS);
    const gain = num(l.gain, 0, 1, 0.3);
    if (from === undefined || duration === undefined) continue;
    layers.push({
      type,
      ...(WAVES.has(l.wave as string) ? { wave: l.wave } : {}),
      from,
      ...(num(l.to, 20, 12000) !== undefined ? { to: num(l.to, 20, 12000) } : {}),
      duration,
      gain: gain ?? 0.3,
      ...(num(l.delay, 0, 1) ? { delay: num(l.delay, 0, 1) } : {}),
      ...(FILTERS.has(l.filter as string) ? { filter: l.filter } : {}),
      ...(num(l.q, 0.1, 20) !== undefined ? { q: num(l.q, 0.1, 20) } : {}),
    });
  }
  if (!layers.length) return null;
  const name = typeof s.name === "string" ? s.name.slice(0, 40) : "Custom sound";
  return { name, layers };
}

// ---- Animations -----------------------------------------------------------
export interface Keyframe {
  /** Position through the animation, 0 to 100 */
  at: number;
  scale?: number;
  rotate?: number;
  /** Percentage of the element's own size */
  x?: number;
  y?: number;
  opacity?: number;
  brightness?: number;
}

export interface GeneratedAnimation {
  name: string;
  /** Milliseconds */
  duration: number;
  keyframes: Keyframe[];
  /** Run continuously rather than once on interaction */
  repeat?: boolean;
}

export const MAX_KEYFRAMES = 8;

export function normalizeAnimation(raw: unknown): GeneratedAnimation | null {
  const a = raw as GeneratedAnimation;
  if (!a || typeof a !== "object" || !Array.isArray(a.keyframes)) return null;
  const frames: Keyframe[] = [];
  for (const entry of a.keyframes.slice(0, MAX_KEYFRAMES)) {
    const k = entry as Keyframe;
    if (!k || typeof k !== "object") continue;
    const at = num(k.at, 0, 100);
    if (at === undefined) continue;
    const frame: Keyframe = { at };
    const scale = num(k.scale, 0.2, 3);
    const rotate = num(k.rotate, -720, 720);
    const x = num(k.x, -100, 100);
    const y = num(k.y, -100, 100);
    const opacity = num(k.opacity, 0, 1);
    const brightness = num(k.brightness, 0.2, 3);
    if (scale !== undefined) frame.scale = scale;
    if (rotate !== undefined) frame.rotate = rotate;
    if (x !== undefined) frame.x = x;
    if (y !== undefined) frame.y = y;
    if (opacity !== undefined) frame.opacity = opacity;
    if (brightness !== undefined) frame.brightness = brightness;
    frames.push(frame);
  }
  if (frames.length < 2) return null;
  frames.sort((p, q) => p.at - q.at);
  return {
    name: typeof a.name === "string" ? a.name.slice(0, 40) : "Custom animation",
    duration: num(a.duration, 80, 6000, 400)!,
    keyframes: frames,
    ...(a.repeat === true ? { repeat: true } : {}),
  };
}

// Build the CSS for one keyframe. Every value came through the clamps above,
// so this only ever emits numbers into fixed property names.
function frameCss(k: Keyframe): string {
  const parts: string[] = [];
  const transform: string[] = [];
  if (k.x !== undefined || k.y !== undefined) {
    transform.push(`translate(${k.x ?? 0}%, ${k.y ?? 0}%)`);
  }
  if (k.scale !== undefined) transform.push(`scale(${k.scale})`);
  if (k.rotate !== undefined) transform.push(`rotate(${k.rotate}deg)`);
  if (transform.length) parts.push(`transform: ${transform.join(" ")}`);
  if (k.opacity !== undefined) parts.push(`opacity: ${k.opacity}`);
  if (k.brightness !== undefined) parts.push(`filter: brightness(${k.brightness})`);
  return parts.join("; ");
}

/** Turn a generated animation into a CSS rule, named for the element using it. */
export function animationCss(id: string, anim: GeneratedAnimation): string {
  const keyName = `ums-gen-${id.replace(/[^a-z0-9]/gi, "-")}`;
  const frames = anim.keyframes
    .map((k) => `  ${k.at}% { ${frameCss(k)}; }`)
    .join("\n");
  return `@keyframes ${keyName} {\n${frames}\n}`;
}

export function animationName(id: string): string {
  return `ums-gen-${id.replace(/[^a-z0-9]/gi, "-")}`;
}
