// User-made themes: a small definition (four colors) is turned into the
// full set of CSS variables the app uses, for both light and dark mode.

export interface ThemeDefinition {
  primary: string; // hex accent color — buttons, links, highlights
  gradient: [string, string, string]; // hex stops for avatars/logo
  tint: string; // hex whose hue tints dark backgrounds
  // Optional extra roles. Older themes (which only have the three above)
  // keep working: anything missing is derived from the colors that exist.
  bubble?: [string, string]; // your own message bubbles
  received?: string; // the other person's message bubbles
  sidebar?: string; // navigation bar / sidebar
  surface?: string; // cards, panels, chat list
}

export interface CustomTheme {
  id: string;
  name: string;
  author_id: string;
  author_name: string;
  definition: ThemeDefinition;
  /** Motion, background animation and ambient sound bundled with the theme */
  effects?: import("@/lib/themeEffects").ThemeEffects;
  is_public: boolean;
  installs: number;
  created_at: string;
}

export const DEFAULT_DEFINITION: ThemeDefinition = {
  primary: "#3b82f6",
  gradient: ["#8b5cf6", "#3b82f6", "#06b6d4"],
  tint: "#1e3a8a",
  bubble: ["#6366f1", "#3b82f6"],
  received: "#1f2937",
  sidebar: "#111827",
  surface: "#151b28",
};

// Every color role, for the editor UI
export const THEME_ROLES = [
  { key: "primary", label: "Accent", hint: "Buttons, links, highlights" },
  { key: "bubble0", label: "Your bubble (start)", hint: "Messages you send" },
  { key: "bubble1", label: "Your bubble (end)", hint: "The other end of the fade" },
  { key: "received", label: "Their bubble", hint: "Messages you receive" },
  { key: "sidebar", label: "Navigation bar", hint: "The side / bottom bar" },
  { key: "surface", label: "Cards & panels", hint: "Chat list, settings cards" },
  { key: "gradient0", label: "Gradient start", hint: "Avatars and the logo" },
  { key: "gradient1", label: "Gradient middle", hint: "Avatars and the logo" },
  { key: "gradient2", label: "Gradient end", hint: "Avatars and the logo" },
  { key: "tint", label: "Background tint", hint: "The dark background colour" },
] as const;

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const hsl = (h: number, s: number, l: number) => `${h} ${s}% ${l}%`;

const HEX = /^#[0-9a-f]{6}$/i;
const okHex = (v: unknown) => typeof v === "string" && HEX.test(v);

export function isValidDefinition(d: unknown): d is ThemeDefinition {
  const x = d as ThemeDefinition;
  if (!x || !okHex(x.primary) || !okHex(x.tint)) return false;
  if (!Array.isArray(x.gradient) || x.gradient.length !== 3 || !x.gradient.every(okHex)) return false;
  // Optional roles must be valid when present
  if (x.bubble !== undefined && !(Array.isArray(x.bubble) && x.bubble.length === 2 && x.bubble.every(okHex))) return false;
  for (const k of ["received", "sidebar", "surface"] as const) {
    if (x[k] !== undefined && !okHex(x[k])) return false;
  }
  return true;
}

// Fill in any role the theme doesn't define, from the ones it does.
export function completeDefinition(d: ThemeDefinition): Required<ThemeDefinition> {
  const p = hexToHsl(d.primary);
  const t = hexToHsl(d.tint);
  return {
    primary: d.primary,
    gradient: d.gradient,
    tint: d.tint,
    bubble: d.bubble ?? [d.gradient[0], d.gradient[1]],
    received: d.received ?? hexFromHsl(t.h, Math.min(t.s, 22), 16),
    sidebar: d.sidebar ?? hexFromHsl(t.h, Math.min(t.s, 26), 9),
    surface: d.surface ?? hexFromHsl(t.h, Math.min(t.s, 24), 12),
    // keep the accent handy for callers that spread this
    ...({} as Record<string, never>),
  } as Required<ThemeDefinition> & { primaryHsl?: typeof p };
}

export function hexFromHsl(h: number, s: number, l: number): string {
  const S = Math.min(100, Math.max(0, s)) / 100;
  const L = Math.min(100, Math.max(0, l)) / 100;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function gradientCss(d: ThemeDefinition): string {
  return `linear-gradient(135deg, ${d.gradient.join(", ")})`;
}

export function bubbleGradientCss(d: ThemeDefinition): string {
  const b = d.bubble ?? [d.gradient[0], d.gradient[1]];
  return `linear-gradient(135deg, ${b[0]}, ${b[1]})`;
}

// Compute the CSS variables for a definition in the given mode
export function themeVariables(d: ThemeDefinition, mode: "light" | "dark"): Record<string, string> {
  const full = completeDefinition(d);
  const p = hexToHsl(d.primary);
  const t = hexToHsl(d.tint);
  const rec = hexToHsl(full.received);
  const side = hexToHsl(full.sidebar);
  const surf = hexToHsl(full.surface);
  const h = t.h;
  const vars: Record<string, string> = {
    "--bubble-sent-gradient": bubbleGradientCss(d),
  };

  if (mode === "light") {
    const l = Math.min(p.l, 55); // keep white text readable on buttons
    const primary = hsl(p.h, p.s, l);
    // In light mode the custom surfaces are used as gentle tints so text
    // stays readable: we keep their hue but force a light lightness.
    const lightSurface = hsl(surf.h, Math.min(surf.s, 40), 96);
    const lightSidebar = hsl(side.h, Math.min(side.s, 35), 97);
    const lightReceived = hsl(rec.h, Math.min(rec.s, 35), 93);
    Object.assign(vars, {
      "--primary": primary,
      "--primary-foreground": "0 0% 100%",
      "--ring": primary,
      "--card": lightSurface,
      "--popover": lightSurface,
      "--secondary": lightReceived,
      "--accent": hsl(surf.h, Math.min(surf.s, 30), 94),
      "--muted": hsl(surf.h, Math.min(surf.s, 25), 95),
      "--sidebar-background": lightSidebar,
      "--sidebar-primary": primary,
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": hsl(side.h, Math.min(side.s, 30), 94),
      "--sidebar-ring": primary,
      "--messenger-gradient": gradientCss(d),
    });
  } else {
    const l = Math.max(p.l, 50); // bright enough on dark backgrounds
    const primary = hsl(p.h, p.s, l);
    const fg = l > 62 && p.s > 60 ? "0 0% 5%" : "0 0% 100%";
    const sat = Math.min(Math.max(t.s, 8), 30); // subtle background tint
    // Each surface keeps the hue the theme chose for it, at a lightness
    // that stays comfortable to read on.
    const surface = (c: { h: number; s: number; l: number }, l: number, maxS = 26) =>
      hsl(c.h, Math.min(c.s, maxS), l);
    Object.assign(vars, {
      "--background": hsl(h, sat, 4),
      "--foreground": hsl(h, 30, 96),
      "--card": surface(surf, 8),
      "--card-foreground": hsl(h, 30, 96),
      "--popover": surface(surf, 8),
      "--popover-foreground": hsl(h, 30, 96),
      "--primary": primary,
      "--primary-foreground": fg,
      "--secondary": surface(rec, 15, 30),
      "--secondary-foreground": hsl(rec.h, 25, 92),
      "--muted": surface(surf, 16),
      "--muted-foreground": hsl(surf.h, 15, 58),
      "--accent": surface(surf, 14),
      "--accent-foreground": hsl(h, 30, 96),
      "--border": surface(surf, 17, 20),
      "--input": surface(surf, 17, 20),
      "--ring": primary,
      "--sidebar-background": surface(side, 6, 30),
      "--sidebar-foreground": hsl(side.h, 25, 72),
      "--sidebar-primary": primary,
      "--sidebar-primary-foreground": fg,
      "--sidebar-accent": surface(side, 13, 28),
      "--sidebar-accent-foreground": hsl(side.h, 28, 92),
      "--sidebar-border": surface(side, 14, 22),
      "--sidebar-ring": primary,
      "--messenger-gradient": gradientCss(d),
    });
  }
  return vars;
}

const ALL_VARS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover", "--popover-foreground",
  "--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--border", "--input", "--ring", "--sidebar-background", "--sidebar-foreground",
  "--sidebar-primary", "--sidebar-primary-foreground", "--sidebar-accent", "--sidebar-accent-foreground",
  "--sidebar-border", "--sidebar-ring", "--messenger-gradient", "--bubble-sent-gradient",
];

export function applyThemeVariables(el: HTMLElement, d: ThemeDefinition | null, mode: "light" | "dark") {
  ALL_VARS.forEach((v) => el.style.removeProperty(v));
  if (!d) return;
  const vars = themeVariables(d, mode);
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
}
