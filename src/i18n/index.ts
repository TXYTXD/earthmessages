import { en, type StringKey, type Strings } from "./strings";
import { el } from "./el";
import { es } from "./es";
import { zh } from "./zh";
import { ar } from "./ar";

// A language only carries the strings it has. Anything it is missing falls
// back to English, so a half-finished translation shows real words rather
// than blanks or key names.
export const DICTIONARIES: Record<string, Strings> = { en, el, es, zh, ar };

export function translate(lang: string, key: StringKey, vars?: Record<string, string>): string {
  const text = DICTIONARIES[lang]?.[key] ?? en[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) => vars[name] ?? whole);
}

/** How much of the interface exists in a language, 0 to 1. */
export function coverage(lang: string): number {
  const dict = DICTIONARIES[lang];
  if (!dict) return 0;
  const total = Object.keys(en).length;
  return Object.keys(dict).length / total;
}

export type { StringKey };
export { en };
