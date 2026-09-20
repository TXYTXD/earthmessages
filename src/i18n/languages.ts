// Languages the interface itself can be shown in. Separate from the
// translation feature, which is about the messages people send.

export interface AppLanguage {
  code: string;
  /** The language's own name, which is what speakers of it look for */
  native: string;
  english: string;
  flag: string;
  rtl?: boolean;
}

export const APP_LANGUAGES: AppLanguage[] = [
  { code: "en", native: "English", english: "English", flag: "🇬🇧" },
  { code: "el", native: "Ελληνικά", english: "Greek", flag: "🇬🇷" },
  { code: "es", native: "Español", english: "Spanish", flag: "🇪🇸" },
  { code: "fr", native: "Français", english: "French", flag: "🇫🇷" },
  { code: "de", native: "Deutsch", english: "German", flag: "🇩🇪" },
  { code: "it", native: "Italiano", english: "Italian", flag: "🇮🇹" },
  { code: "pt", native: "Português", english: "Portuguese", flag: "🇵🇹" },
  { code: "nl", native: "Nederlands", english: "Dutch", flag: "🇳🇱" },
  { code: "pl", native: "Polski", english: "Polish", flag: "🇵🇱" },
  { code: "ru", native: "Русский", english: "Russian", flag: "🇷🇺" },
  { code: "tr", native: "Türkçe", english: "Turkish", flag: "🇹🇷" },
  { code: "zh", native: "中文", english: "Chinese", flag: "🇨🇳" },
  { code: "ja", native: "日本語", english: "Japanese", flag: "🇯🇵" },
  { code: "ko", native: "한국어", english: "Korean", flag: "🇰🇷" },
  { code: "hi", native: "हिन्दी", english: "Hindi", flag: "🇮🇳" },
  { code: "ar", native: "العربية", english: "Arabic", flag: "🇸🇦", rtl: true },
];

export const LANGUAGE_BY_CODE = new Map(APP_LANGUAGES.map((l) => [l.code, l]));

/** The best match for whatever the device is set to, falling back to English. */
export function detectLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  for (const tag of navigator.languages ?? [navigator.language]) {
    if (!tag) continue;
    const base = tag.toLowerCase().split("-")[0];
    if (LANGUAGE_BY_CODE.has(base)) return base;
  }
  return "en";
}
