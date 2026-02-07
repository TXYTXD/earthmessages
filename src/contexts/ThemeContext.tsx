import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeName = "default" | "ocean" | "sunset" | "forest" | "midnight" | "rose";
export type ColorMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
  colorMode: "dark",
  setColorMode: () => {},
  toggleColorMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem("app-theme") as ThemeName) || "default";
  });

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem("color-mode") as ColorMode) || "dark";
  });

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem("app-theme", t);
  };

  const setColorMode = (mode: ColorMode) => {
    setColorModeState(mode);
    localStorage.setItem("color-mode", mode);
  };

  const toggleColorMode = () => {
    setColorMode(colorMode === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (colorMode === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [colorMode]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorMode, setColorMode, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
