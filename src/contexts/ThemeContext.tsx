import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeName = "default" | "ocean" | "sunset" | "forest" | "midnight" | "rose";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "default", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem("app-theme") as ThemeName) || "default";
  });

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem("app-theme", t);
  };

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
