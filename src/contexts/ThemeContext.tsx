import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { applyThemeVariables, isValidDefinition, type ThemeDefinition } from "@/lib/customThemes";
import {
  DEFAULT_EFFECTS, MOTION_TOKENS, normalizeEffects, type ThemeEffects,
} from "@/lib/themeEffects";
import {
  applyCustomization, normalizeCustomization, type ThemeCustomization,
} from "@/lib/themeCustomization";
import { setUISoundVolume, unlockUISounds } from "@/lib/uiSounds";

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
  setCustomTheme: (
    id: string,
    definition: ThemeDefinition,
    effects?: ThemeEffects | null,
    customization?: ThemeCustomization | null
  ) => void;
  /** Per-element overrides: colours, icons, sounds and animations */
  customization: ThemeCustomization;
  /** Whether interface sounds a theme attaches to buttons may play */
  uiSoundsEnabled: boolean;
  setUiSoundsEnabled: (on: boolean) => void;
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
  customization: {},
  uiSoundsEnabled: true,
  setUiSoundsEnabled: () => {},
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
const CUSTOM_ELEMENTS_KEY = "app-theme-elements";
const UI_SOUNDS_KEY = "app-ui-sounds-enabled";

function loadCustomDefinition(): ThemeDefinition | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "null");
    return isValidDefinition(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadCustomization(): ThemeCustomization {
  try {
    const raw = localStorage.getItem(CUSTOM_ELEMENTS_KEY);
    return raw ? normalizeCustomization(JSON.parse(raw)) : {};
  } catch {
    return {};
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
  const [customization, setCustomization] = useState<ThemeCustomization>(loadCustomization);
  const [uiSoundsEnabled, setUiSoundsEnabledState] = useState<boolean>(
    () => localStorage.getItem(UI_SOUNDS_KEY) !== "false"
  );
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

  const persistCustomization = (c: ThemeCustomization) => {
    setCustomization(c);
    try {
      localStorage.setItem(CUSTOM_ELEMENTS_KEY, JSON.stringify(c));
    } catch {
      /* ignore */
    }
  };

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem("app-theme", t);
    // Built-in themes carry no effects or element overrides of their own
    persistEffects(DEFAULT_EFFECTS);
    persistCustomization({});
  };

  const setUiSoundsEnabled = (on: boolean) => {
    setUiSoundsEnabledState(on);
    localStorage.setItem(UI_SOUNDS_KEY, String(on));
  };

  const setCustomTheme = (
    id: string,
    definition: ThemeDefinition,
    themeEffects?: ThemeEffects | null,
    themeCustomization?: ThemeCustomization | null
  ) => {
    setCustomDefinition(definition);
    setThemeState(`custom:${id}`);
    localStorage.setItem("app-theme", `custom:${id}`);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(definition));
    persistEffects(normalizeEffects(themeEffects ?? DEFAULT_EFFECTS));
    persistCustomization(normalizeCustomization(themeCustomization ?? {}));
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
    applyCustomization(body, customization);

    return () => clearTimeout(transitionTimer.current);
  }, [theme, customDefinition, colorMode, customization]);

  // Interface sounds need a real gesture before a browser will play them
  useEffect(() => {
    if (!uiSoundsEnabled) return;
    const once = () => unlockUISounds();
    window.addEventListener("pointerdown", once, { once: true });
    window.addEventListener("keydown", once, { once: true });
    return () => {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
    };
  }, [uiSoundsEnabled]);

  useEffect(() => {
    setUISoundVolume(uiSoundsEnabled ? 100 : 0);
  }, [uiSoundsEnabled]);

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
        customization, uiSoundsEnabled, setUiSoundsEnabled,
        effects, effectsEnabled, setEffectsEnabled, soundEnabled, setSoundEnabled,
        colorMode, setColorMode, toggleColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
