// User-made themes: a small definition (four colors) is turned into the
// full set of CSS variables the app uses, for both light and dark mode.

export interface ThemeDefinition {
  primary: string; // hex accent color
  gradient: [string, string, string]; // hex stops for avatars/logo
  tint: string; // hex whose hue tints dark backgrounds
}

export interface CustomTheme {
  id: string;
  name: string;
  author_id: string;
  author_name: string;
  definition: ThemeDefinition;
  is_public: boolean;
  installs: number;
  created_at: string;
}

export const DEFAULT_DEFINITION: ThemeDefinition = {
  primary: "#3b82f6",
  gradient: ["#8b5cf6", "#3b82f6", "#06b6d4"],
  tint: "#1e3a8a",
};

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

export function isValidDefinition(d: unknown): d is ThemeDefinition {
  const x = d as ThemeDefinition;
  const hex = /^#[0-9a-f]{6}$/i;
  return (
    !!x && hex.test(x.primary) && hex.test(x.tint) && Array.isArray(x.gradient) &&
    x.gradient.length === 3 && x.gradient.every((c) => hex.test(c))
  );
}

export function gradientCss(d: ThemeDefinition): string {
  return `linear-gradient(135deg, ${d.gradient.join(", ")})`;
}

// Compute the CSS variables for a definition in the given mode
export function themeVariables(d: ThemeDefinition, mode: "light" | "dark"): Record<string, string> {
  const p = hexToHsl(d.primary);
  const t = hexToHsl(d.tint);
  const h = t.h;
  const vars: Record<string, string> = {};

  if (mode === "light") {
    const l = Math.min(p.l, 55); // keep white text readable on buttons
    const primary = hsl(p.h, p.s, l);
    Object.assign(vars, {
      "--primary": primary,
      "--primary-foreground": "0 0% 100%",
      "--ring": primary,
      "--sidebar-primary": primary,
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-ring": primary,
      "--messenger-gradient": gradientCss(d),
    });
  } else {
    const l = Math.max(p.l, 50); // bright enough on dark backgrounds
    const primary = hsl(p.h, p.s, l);
    const fg = l > 62 && p.s > 60 ? "0 0% 5%" : "0 0% 100%";
    const sat = Math.min(Math.max(t.s, 8), 30); // subtle background tint
    Object.assign(vars, {
      "--background": hsl(h, sat, 4),
      "--foreground": hsl(h, 30, 96),
      "--card": hsl(h, sat, 8),
      "--card-foreground": hsl(h, 30, 96),
      "--popover": hsl(h, sat, 8),
      "--popover-foreground": hsl(h, 30, 96),
      "--primary": primary,
      "--primary-foreground": fg,
      "--secondary": hsl(h, Math.min(sat, 15), 14),
      "--secondary-foreground": hsl(h, 30, 90),
      "--muted": hsl(h, Math.min(sat, 14), 16),
      "--muted-foreground": hsl(h, 15, 55),
      "--accent": hsl(h, Math.min(sat, 15), 14),
      "--accent-foreground": hsl(h, 30, 96),
      "--border": hsl(h, Math.min(sat, 15), 16),
      "--input": hsl(h, Math.min(sat, 15), 16),
      "--ring": primary,
      "--sidebar-background": hsl(h, sat, 5),
      "--sidebar-foreground": hsl(h, 30, 70),
      "--sidebar-primary": primary,
      "--sidebar-primary-foreground": fg,
      "--sidebar-accent": hsl(h, Math.min(sat, 15), 12),
      "--sidebar-accent-foreground": hsl(h, 30, 90),
      "--sidebar-border": hsl(h, Math.min(sat, 15), 14),
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
  "--sidebar-border", "--sidebar-ring", "--messenger-gradient",
];

export function applyThemeVariables(el: HTMLElement, d: ThemeDefinition | null, mode: "light" | "dark") {
  ALL_VARS.forEach((v) => el.style.removeProperty(v));
  if (!d) return;
  const vars = themeVariables(d, mode);
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
}
