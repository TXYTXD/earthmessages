import { useMemo } from "react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { completeDefinition } from "@/lib/customThemes";

// Soft pools of colour that sit under the whole app.
//
// They exist for the frosted surfaces above them: blur over a flat colour
// produces a flat colour, so without something to blur the glass looks like
// plain translucency. These drift slowly, which makes the glass appear to
// breathe as you use it.
//
// They take their colours from whatever theme is on, and they go quiet when
// the person has turned effects off.
export function AmbientHalos() {
  const { effects, effectsEnabled, customDefinition } = useThemeContext();

  const colors = useMemo(() => {
    if (customDefinition) {
      const full = completeDefinition(customDefinition);
      const picked = [...customDefinition.gradient, full.bubble[0]].filter(Boolean);
      if (picked.length >= 3) return picked.slice(0, 3);
    }
    // The built-in themes all express themselves through --primary, so
    // leaning on it keeps the halos in step with whichever one is on.
    return ["hsl(var(--primary))", "hsl(var(--primary-glow))", "hsl(var(--success))"];
  }, [customDefinition]);

  // Someone who switched effects off, or asked for no motion, does not want
  // three drifting blobs behind their messages. The colour stays either way —
  // it is what the frosted surfaces are blurring.
  const drifting = effectsEnabled && effects.motion !== "none";

  const halos = [
    { c: colors[0], size: "58vmax", left: "-18vmax", top: "-14vmax", cls: "halo-drift-a", o: 0.42 },
    { c: colors[1], size: "46vmax", left: "52vw", top: "46vh", cls: "halo-drift-b", o: 0.30 },
    { c: colors[2], size: "40vmax", left: "68vw", top: "-16vmax", cls: "halo-drift-c", o: 0.26 },
  ];

  return (
    <div className="halo-field" aria-hidden="true">
      {halos.map((h, i) => (
        <div
          key={i}
          className={`halo ${drifting ? h.cls : ""}`}
          style={{
            background: h.c,
            width: h.size,
            height: h.size,
            left: h.left,
            top: h.top,
            opacity: h.o,
          }}
        />
      ))}
    </div>
  );
}
