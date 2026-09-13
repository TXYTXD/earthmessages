import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { applyThemeVariables, isValidDefinition, type ThemeDefinition } from "@/lib/customThemes";
import {
  DEFAULT_EFFECTS, MOTION_TOKENS, normalizeEffects, type ThemeEffects,
} from "@/lib/themeEffects";

export type ThemeName =
  | "default" | "ocean" | "sunset" | "forest" | "midnight" | "rose"
  | "lavender" | "mint" | "gold" | "cherry" | "sky" | "coral" | "mono" | "neon" | "mocha" | "arctic";
export type ColorMode = "light" | "dark";

// A theme is either a built-in name or "custom:<id>" from the Theme Market
export type ThemeId = ThemeName | `custom:${string}`;

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeName) => void;
  customDefinition: ThemeDefinition | null;
  setCustomTheme: (id: string, definition: ThemeDefinition, effects?: ThemeEffects | null) => void;
  /** Motion, background and sound that came with the current theme */
  effects: ThemeEffects;
  /** Whether the person lets themes play background animation and sound */
  effectsEnabled: boolean;
  setEffectsEnabled: (on: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (on: boolean) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
  customDefinition: null,
  setCustomTheme: () => {},
  effects: DEFAULT_EFFECTS,
  effectsEnabled: true,
  setEffectsEnabled: () => {},
  soundEnabled: false,
  setSoundEnabled: () => {},
  colorMode: "dark",
  setColorMode: () => {},
  toggleColorMode: () => {},
});

const CUSTOM_KEY = "app-custom-theme";
const EFFECTS_KEY = "app-theme-effects";
const EFFECTS_ON_KEY = "app-effects-enabled";
const SOUND_ON_KEY = "app-ambience-enabled";

function loadCustomDefinition(): ThemeDefinition | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "null");
    return isValidDefinition(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadEffects(): ThemeEffects {
  try {
    const raw = localStorage.getItem(EFFECTS_KEY);
    return raw ? normalizeEffects(JSON.parse(raw)) : DEFAULT_EFFECTS;
  } catch {
    return DEFAULT_EFFECTS;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem("app-theme") as ThemeId) || "default";
  });
  const [customDefinition, setCustomDefinition] = useState<ThemeDefinition | null>(loadCustomDefinition);
  const [effects, setEffects] = useState<ThemeEffects>(loadEffects);
  // Sound is off until the person asks for it — no app should start making
  // noise on its own. Visual effects are on but can be turned off.
  const [effectsEnabled, setEffectsEnabledState] = useState<boolean>(
    () => localStorage.getItem(EFFECTS_ON_KEY) !== "false"
  );
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(
    () => localStorage.getItem(SOUND_ON_KEY) === "true"
  );

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem("color-mode") as ColorMode) || "dark";
  });

  const persistEffects = (e: ThemeEffects) => {
    setEffects(e);
    try {
      localStorage.setItem(EFFECTS_KEY, JSON.stringify(e));
    } catch {
      /* ignore */
    }
  };

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem("app-theme", t);
    // Built-in themes carry no effects of their own
    persistEffects(DEFAULT_EFFECTS);
  };

  const setCustomTheme = (id: string, definition: ThemeDefinition, themeEffects?: ThemeEffects | null) => {
    setCustomDefinition(definition);
    setThemeState(`custom:${id}`);
    localStorage.setItem("app-theme", `custom:${id}`);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(definition));
    persistEffects(normalizeEffects(themeEffects ?? DEFAULT_EFFECTS));
  };

  const setEffectsEnabled = (on: boolean) => {
    setEffectsEnabledState(on);
    localStorage.setItem(EFFECTS_ON_KEY, String(on));
  };

  const setSoundEnabled = (on: boolean) => {
    setSoundEnabledState(on);
    localStorage.setItem(SOUND_ON_KEY, String(on));
  };

  const setColorMode = (mode: ColorMode) => {
    setColorModeState(mode);
    localStorage.setItem("color-mode", mode);
  };

  const toggleColorMode = () => {
    setColorMode(colorMode === "dark" ? "light" : "dark");
  };

  // Ease every colour to its new value when the theme changes, but not on
  // the very first paint (which would fade the app in from the wrong colours).
  const firstPaint = useRef(true);
  const transitionTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const body = document.body;
    if (!firstPaint.current) {
      body.classList.add("theme-transition");
      clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => body.classList.remove("theme-transition"), 500);
    }
    firstPaint.current = false;

    const isCustom = theme.startsWith("custom:");
    body.setAttribute("data-theme", isCustom ? "default" : theme);
    applyThemeVariables(body, isCustom && customDefinition ? customDefinition : null, colorMode);

    return () => clearTimeout(transitionTimer.current);
  }, [theme, customDefinition, colorMode]);

  // How fast the whole UI moves, as CSS variables the app animates against
  useEffect(() => {
    const motion = effectsEnabled ? effects.motion : "smooth";
    const token = MOTION_TOKENS[motion] ?? MOTION_TOKENS.smooth;
    const root = document.documentElement;
    root.style.setProperty("--motion-scale", String(token.scale));
    root.style.setProperty("--motion-ease", token.ease);
    root.classList.toggle("motion-off", token.scale === 0);
  }, [effects.motion, effectsEnabled]);

  useEffect(() => {
    if (colorMode === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [colorMode]);

  return (
    <ThemeContext.Provider
      value={{
        theme, setTheme, customDefinition, setCustomTheme,
        effects, effectsEnabled, setEffectsEnabled, soundEnabled, setSoundEnabled,
        colorMode, setColorMode, toggleColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
