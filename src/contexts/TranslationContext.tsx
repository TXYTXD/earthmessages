import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TranslationSettings {
  primaryLang: string;
  autoTranslate: boolean;
  showOriginal: boolean;
  voiceTranslation: boolean;
}

interface TranslationContextType extends TranslationSettings {
  setPrimaryLang: (lang: string) => void;
  setAutoTranslate: (v: boolean) => void;
  setShowOriginal: (v: boolean) => void;
  setVoiceTranslation: (v: boolean) => void;
  translateText: (text: string, sourceLang?: string) => Promise<string | null>;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

export const useTranslation = () => {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error("useTranslation must be used within TranslationProvider");
  return ctx;
};

const STORAGE_KEY = "translation_settings";

function loadSettings(): TranslationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { primaryLang: "en", autoTranslate: true, showOriginal: true, voiceTranslation: true };
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TranslationSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<TranslationSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const translateText = useCallback(
    async (text: string, sourceLang?: string): Promise<string | null> => {
      if (!settings.autoTranslate || !text.trim()) return null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return null;
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              text,
              targetLang: settings.primaryLang,
              sourceLang,
            }),
          }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.translatedText || null;
      } catch {
        return null;
      }
    },
    [settings.autoTranslate, settings.primaryLang]
  );

  return (
    <TranslationContext.Provider
      value={{
        ...settings,
        setPrimaryLang: (v) => update({ primaryLang: v }),
        setAutoTranslate: (v) => update({ autoTranslate: v }),
        setShowOriginal: (v) => update({ showOriginal: v }),
        setVoiceTranslation: (v) => update({ voiceTranslation: v }),
        translateText,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}
