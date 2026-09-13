import { useMemo } from "react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useAmbientSound } from "@/hooks/useAmbientSound";
import { ThemeBackground } from "@/components/ThemeBackground";
import { completeDefinition } from "@/lib/customThemes";

// Draws the current theme's background animation and plays its ambience.
// Both obey the person's own switches in Settings.
export function ThemeAmbience() {
  const { effects, effectsEnabled, soundEnabled, customDefinition } = useThemeContext();

  const colors = useMemo(() => {
    if (!customDefinition) return ["#8b5cf6", "#3b82f6", "#06b6d4"];
    const full = completeDefinition(customDefinition);
    return [...customDefinition.gradient, full.bubble[0], full.bubble[1]];
  }, [customDefinition]);

  useAmbientSound(effects.sound, effects.soundVolume, effectsEnabled && soundEnabled);

  return (
    <ThemeBackground
      kind={effects.background}
      intensity={effects.backgroundIntensity}
      colors={colors}
      paused={!effectsEnabled}
    />
  );
}
