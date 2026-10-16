import type { NewsCategory } from "@/hooks/useNews";

/** One colour and one little picture per kind of news, used everywhere it shows. */
export function categoryStyle(c: NewsCategory) {
  switch (c) {
    case "fun":
      return { emoji: "🎉", labelKey: "news.cat.fun" as const, bg: "bg-pink-500/15", text: "text-pink-600 dark:text-pink-300", ring: "ring-pink-500/60" };
    case "tip":
      return { emoji: "💡", labelKey: "news.cat.tip" as const, bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-300", ring: "ring-amber-500/60" };
    case "safety":
      return { emoji: "🛡️", labelKey: "news.cat.safety" as const, bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-500/60" };
    default:
      return { emoji: "📣", labelKey: "news.cat.update" as const, bg: "bg-sky-500/15", text: "text-sky-600 dark:text-sky-300", ring: "ring-sky-500/60" };
  }
}
