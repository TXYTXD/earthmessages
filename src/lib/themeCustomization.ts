// Per-element overrides: the "advanced" half of a theme. Each entry says how
// one part of UMS should look, what icon it uses, how it animates and what
// it sounds like. Everything is optional — a theme only stores what it changed.

import {
  ELEMENT_BY_ID, isElementAnimation, isIconName,
  type ElementAnimation, type IconName,
} from "@/lib/themeElements";
import { isUISound, type UISoundName } from "@/lib/uiSounds";
import { isLibrarySoundRef } from "@/lib/soundLibrary";

export interface ElementStyle {
  color?: string;       // hex — text/icon colour
  background?: string;  // hex — fill
  icon?: IconName;
  /** A built-in sound, or "url:<Wikimedia audio URL>" from the sound library */
  sound?: UISoundName | string;
  animation?: ElementAnimation;
}

export type ThemeCustomization = Record<string, ElementStyle>;

const HEX = /^#[0-9a-f]{6}$/i;
const MAX_ELEMENTS = 80;

// Overrides arrive from other people's browsers, so nothing is trusted:
// unknown elements, bad colours and unknown icons/sounds are dropped.
export function normalizeCustomization(raw: unknown): ThemeCustomization {
  if (!raw || typeof raw !== "object") return {};
  const out: ThemeCustomization = {};
  let count = 0;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= MAX_ELEMENTS) break;
    const spec = ELEMENT_BY_ID.get(id);
    if (!spec || !value || typeof value !== "object") continue;
    const v = value as ElementStyle;
    const style: ElementStyle = {};
    if (spec.traits.includes("color") && typeof v.color === "string" && HEX.test(v.color)) style.color = v.color;
    if (spec.traits.includes("background") && typeof v.background === "string" && HEX.test(v.background)) {
      style.background = v.background;
    }
    if (spec.traits.includes("icon") && isIconName(v.icon)) style.icon = v.icon;
    if (spec.traits.includes("sound") && (isUISound(v.sound) || isLibrarySoundRef(v.sound))) {
      style.sound = v.sound;
    }
    if (spec.traits.includes("animation") && isElementAnimation(v.animation)) style.animation = v.animation;
    if (Object.keys(style).length) {
      out[id] = style;
      count++;
    }
  }
  return out;
}

export function countCustomizations(c: ThemeCustomization | undefined): number {
  return c ? Object.keys(c).length : 0;
}

// Turn the overrides into CSS variables the app styles against.
// An element with cssVar "btn-send" produces --el-btn-send-fg / -bg / -anim.
export function customizationVariables(c: ThemeCustomization): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [id, style] of Object.entries(c)) {
    const spec = ELEMENT_BY_ID.get(id);
    if (!spec?.cssVar) continue;
    if (style.color) vars[`--el-${spec.cssVar}-fg`] = style.color;
    if (style.background) vars[`--el-${spec.cssVar}-bg`] = style.background;
    if (style.animation && style.animation !== "none") {
      vars[`--el-${spec.cssVar}-anim`] = style.animation;
    }
  }
  return vars;
}

const ALL_CUSTOM_VARS = (() => {
  const names: string[] = [];
  for (const spec of ELEMENT_BY_ID.values()) {
    if (!spec.cssVar) continue;
    names.push(`--el-${spec.cssVar}-fg`, `--el-${spec.cssVar}-bg`, `--el-${spec.cssVar}-anim`);
  }
  return names;
})();

export function applyCustomization(el: HTMLElement, c: ThemeCustomization | null) {
  ALL_CUSTOM_VARS.forEach((v) => el.style.removeProperty(v));
  if (!c) return;
  const vars = customizationVariables(c);
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
}

// Readable summary for the market card and the editor
export function describeCustomization(c: ThemeCustomization | undefined): string | null {
  const n = countCustomizations(c);
  if (!n) return null;
  return n === 1 ? "1 element restyled" : `${n} elements restyled`;
}
