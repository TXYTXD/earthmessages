import { useCallback, useMemo } from "react";
import * as Icons from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { ELEMENT_BY_ID } from "@/lib/themeElements";
import { playUISound } from "@/lib/uiSounds";
import type { ElementStyle } from "@/lib/themeCustomization";

export interface ResolvedElement {
  /** Inline style carrying the theme's colours for this element */
  style: React.CSSProperties;
  /** Class that runs this element's animation on interaction */
  className: string;
  /** The icon the theme chose, or null to keep the built-in one */
  Icon: React.ComponentType<{ className?: string }> | null;
  /** Play this element's sound — call it from onClick */
  play: () => void;
  /** The raw overrides, when a component needs them directly */
  overrides: ElementStyle | undefined;
}

const EMPTY: ElementStyle = {};

// Lets any component pick up whatever the current theme says about it:
// colour, icon, animation and sound. Components that never call this keep
// looking exactly as they always did.
export function useElementStyle(elementId: string): ResolvedElement {
  const { customization, effects, effectsEnabled, uiSoundsEnabled } = useThemeContext();
  const overrides = customization?.[elementId];
  const spec = ELEMENT_BY_ID.get(elementId);

  const style = useMemo<React.CSSProperties>(() => {
    if (!overrides) return {};
    const s: React.CSSProperties = {};
    if (overrides.color) s.color = overrides.color;
    if (overrides.background) s.background = overrides.background;
    return s;
  }, [overrides?.color, overrides?.background]);

  const className = useMemo(() => {
    const anim = overrides?.animation;
    if (!anim || anim === "none" || !effectsEnabled) return "";
    return `el-anim el-anim-${anim}`;
  }, [overrides?.animation, effectsEnabled]);

  const Icon = useMemo(() => {
    if (!overrides?.icon) return null;
    const found = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[overrides.icon];
    return found ?? null;
  }, [overrides?.icon]);

  const play = useCallback(() => {
    if (!uiSoundsEnabled) return;
    playUISound(overrides?.sound);
  }, [overrides?.sound, uiSoundsEnabled]);

  void spec;
  void effects;
  return { style, className, Icon, play, overrides: overrides ?? EMPTY };
}
