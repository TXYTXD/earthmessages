// The non-colour half of a theme: how the app moves, what drifts behind it,
// and what it sounds like. All of it is generated on the device — no audio
// files, no video, nothing to download.

export type MotionStyle = "none" | "calm" | "smooth" | "playful" | "snappy";
export type BackgroundKind =
  | "none" | "aurora" | "stars" | "bubbles" | "waves" | "orbs" | "grid" | "snow" | "embers" | "rain";
export type AmbientSound =
  | "none" | "rain" | "waves" | "forest" | "fire" | "space" | "cafe" | "wind";

export interface ThemeEffects {
  motion: MotionStyle;
  background: BackgroundKind;
  backgroundIntensity: number; // 0..100
  sound: AmbientSound;
  soundVolume: number; // 0..100
}

export const DEFAULT_EFFECTS: ThemeEffects = {
  motion: "smooth",
  background: "none",
  backgroundIntensity: 45,
  sound: "none",
  soundVolume: 25,
};

export const MOTION_STYLES: { id: MotionStyle; label: string; hint: string }[] = [
  { id: "none", label: "Off", hint: "No animation anywhere" },
  { id: "calm", label: "Calm", hint: "Slow and gentle" },
  { id: "smooth", label: "Smooth", hint: "The UMS default" },
  { id: "playful", label: "Playful", hint: "Bouncy and lively" },
  { id: "snappy", label: "Snappy", hint: "Fast and direct" },
];

export const BACKGROUNDS: { id: BackgroundKind; label: string; emoji: string }[] = [
  { id: "none", label: "None", emoji: "—" },
  { id: "aurora", label: "Aurora", emoji: "🌌" },
  { id: "stars", label: "Stars", emoji: "✨" },
  { id: "bubbles", label: "Bubbles", emoji: "🫧" },
  { id: "waves", label: "Waves", emoji: "🌊" },
  { id: "orbs", label: "Orbs", emoji: "🔮" },
  { id: "grid", label: "Grid", emoji: "🟦" },
  { id: "snow", label: "Snow", emoji: "❄️" },
  { id: "embers", label: "Embers", emoji: "🔥" },
  { id: "rain", label: "Rain", emoji: "🌧️" },
];

export const SOUNDS: { id: AmbientSound; label: string; emoji: string }[] = [
  { id: "none", label: "Silent", emoji: "—" },
  { id: "rain", label: "Rain", emoji: "🌧️" },
  { id: "waves", label: "Ocean", emoji: "🌊" },
  { id: "forest", label: "Forest", emoji: "🌲" },
  { id: "fire", label: "Fireplace", emoji: "🔥" },
  { id: "space", label: "Deep space", emoji: "🛸" },
  { id: "cafe", label: "Café hum", emoji: "☕" },
  { id: "wind", label: "Wind", emoji: "🍃" },
];

// How fast the whole UI moves, and how it eases.
export const MOTION_TOKENS: Record<MotionStyle, { scale: number; ease: string }> = {
  none: { scale: 0, ease: "linear" },
  calm: { scale: 1.6, ease: "cubic-bezier(0.33, 1, 0.68, 1)" },
  smooth: { scale: 1, ease: "cubic-bezier(0.22, 1, 0.36, 1)" },
  playful: { scale: 1.15, ease: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  snappy: { scale: 0.6, ease: "cubic-bezier(0.4, 0, 0.2, 1)" },
};

const MOTIONS = new Set<string>(MOTION_STYLES.map((m) => m.id));
const BGS = new Set<string>(BACKGROUNDS.map((b) => b.id));
const SNDS = new Set<string>(SOUNDS.map((s) => s.id));

const pct = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback;

// Read effects off a theme that may not have any (older themes), or whose
// values came from someone else's browser — never trust them blindly.
export function normalizeEffects(raw: unknown): ThemeEffects {
  const e = (raw ?? {}) as Partial<ThemeEffects>;
  return {
    motion: MOTIONS.has(e.motion as string) ? (e.motion as MotionStyle) : DEFAULT_EFFECTS.motion,
    background: BGS.has(e.background as string) ? (e.background as BackgroundKind) : DEFAULT_EFFECTS.background,
    backgroundIntensity: pct(e.backgroundIntensity, DEFAULT_EFFECTS.backgroundIntensity),
    sound: SNDS.has(e.sound as string) ? (e.sound as AmbientSound) : DEFAULT_EFFECTS.sound,
    soundVolume: pct(e.soundVolume, DEFAULT_EFFECTS.soundVolume),
  };
}

export function describeEffects(e: ThemeEffects): string[] {
  const out: string[] = [];
  if (e.background !== "none") out.push(BACKGROUNDS.find((b) => b.id === e.background)?.label ?? "");
  if (e.sound !== "none") out.push(SOUNDS.find((s) => s.id === e.sound)?.label ?? "");
  if (e.motion !== "smooth") out.push(MOTION_STYLES.find((m) => m.id === e.motion)?.label ?? "");
  return out.filter(Boolean);
}
