import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { applyThemeVariables, isValidDefinition, type ThemeDefinition } from "@/lib/customThemes";

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
  setCustomTheme: (id: string, definition: ThemeDefinition) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
  customDefinition: null,
  setCustomTheme: () => {},
  colorMode: "dark",
  setColorMode: () => {},
  toggleColorMode: () => {},
});

const CUSTOM_KEY = "app-custom-theme";

function loadCustomDefinition(): ThemeDefinition | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "null");
    return isValidDefinition(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem("app-theme") as ThemeId) || "default";
  });
  const [customDefinition, setCustomDefinition] = useState<ThemeDefinition | null>(loadCustomDefinition);

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem("color-mode") as ColorMode) || "dark";
  });

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem("app-theme", t);
  };

  const setCustomTheme = (id: string, definition: ThemeDefinition) => {
    setCustomDefinition(definition);
    setThemeState(`custom:${id}`);
    localStorage.setItem("app-theme", `custom:${id}`);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(definition));
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

  useEffect(() => {
    if (colorMode === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [colorMode]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, customDefinition, setCustomTheme, colorMode, setColorMode, toggleColorMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
