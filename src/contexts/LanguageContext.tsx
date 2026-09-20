import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type StringKey } from "@/i18n";
import { LANGUAGE_BY_CODE, detectLanguage } from "@/i18n/languages";

interface LanguageContextType {
  /** The language the interface is shown in */
  language: string;
  setLanguage: (code: string) => void;
  /** Look up a piece of interface text, with {name} style placeholders */
  t: (key: StringKey, vars?: Record<string, string>) => string;
  rtl: boolean;
}

const STORAGE_KEY = "app-language";

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => translate("en", key),
  rtl: false,
});

function loadLanguage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGE_BY_CODE.has(saved)) return saved;
  } catch {
    /* ignore */
  }
  // Nobody should have to go and find the setting just to read the app
  return detectLanguage();
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(loadLanguage);

  const setLanguage = useCallback((code: string) => {
    if (!LANGUAGE_BY_CODE.has(code)) return;
    setLanguageState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const rtl = !!LANGUAGE_BY_CODE.get(language)?.rtl;

  // Tell the browser too, so text selection, spell-check and the direction
  // of the whole page follow the chosen language.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [language, rtl]);

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      rtl,
    }),
    [language, setLanguage, rtl]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

/** Shorthand for components that only need the lookup. */
export function useT() {
  return useLanguage().t;
}
