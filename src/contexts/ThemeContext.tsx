import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  useEffect(() => {
    const isCustom = theme.startsWith("custom:");
    document.body.setAttribute("data-theme", isCustom ? "default" : theme);
    applyThemeVariables(document.body, isCustom && customDefinition ? customDefinition : null, colorMode);
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
