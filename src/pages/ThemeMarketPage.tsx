import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Store, Plus, Check, Search, Flame, Clock, Loader2, Download, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useThemeMarket, useMyThemes } from "@/hooks/useThemeMarket";
import { ThemeCreatorDialog, ThemePreview } from "@/components/ThemeCreatorDialog";
import { gradientCss, type CustomTheme } from "@/lib/customThemes";
import { describeEffects, normalizeEffects } from "@/lib/themeEffects";
import { useAuth } from "@/contexts/AuthContext";

export default function ThemeMarketPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, colorMode, setCustomTheme } = useThemeContext();
  const market = useThemeMarket();
  const mine = useMyThemes();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? market.themes.filter((t) => t.name.toLowerCase().includes(q) || t.author_name.toLowerCase().includes(q)) : market.themes;
  }, [market.themes, query]);

  const isAdded = (t: CustomTheme) => mine.installedIds.has(t.id) || t.author_id === user?.id;

  const toggleAdd = async (t: CustomTheme) => {
    setBusyId(t.id);
    try {
      if (mine.installedIds.has(t.id)) {
        await market.uninstall(t.id);
        toast({ title: "Removed from your themes" });
      } else {
        await market.install(t.id);
        toast({ title: "Added to your themes", description: `"${t.name}" is now in Settings → App Theme.` });
      }
      await mine.refetch();
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const use = async (t: CustomTheme) => {
    setCustomTheme(t.id, t.definition, t.effects);
    if (!isAdded(t)) {
      try {
        await market.install(t.id);
        await mine.refetch();
      } catch {
        /* still applied locally */
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold font-display text-xl">Theme Market</h1>
            <p className="text-[13px] text-muted-foreground">Themes made by UMS users. Add any of them to your collection.</p>
          </div>
          <Button onClick={() => setCreating(true)} className="rounded-full gap-2">
            <Paintbrush className="w-4 h-4" /> Create
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-accent/60 rounded-full px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search themes or creators"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex rounded-full bg-accent/60 p-1">
            {(["popular", "new"] as const).map((s) => (
              <button
                key={s}
                onClick={() => market.setSort(s)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium flex items-center gap-1 transition-colors ${
                  market.sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "popular" ? <Flame className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {s === "popular" ? "Popular" : "New"}
              </button>
            ))}
          </div>
        </div>

        {market.loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading themes…
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-medium">No themes here yet</p>
            <p className="text-[13px] text-muted-foreground mt-1">Be the first — create one and publish it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((t, i) => {
              const active = theme === `custom:${t.id}`;
              const added = isAdded(t);
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className={`rounded-2xl border p-3 bg-card space-y-3 ${active ? "border-primary ring-1 ring-primary/40" : "border-border"}`}
                >
                  <ThemePreview definition={t.definition} mode={colorMode} name={t.name} />
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: gradientCss(t.definition) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        by {t.author_name || "Someone"} · <Download className="w-3 h-3 inline -mt-0.5" /> {t.installs}
                      </p>
                      {describeEffects(normalizeEffects(t.effects)).length > 0 && (
                        <p className="text-[10px] text-primary/90 truncate">
                          ✨ {describeEffects(normalizeEffects(t.effects)).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => use(t)} className="rounded-full flex-1 gap-1" variant={active ? "secondary" : "default"}>
                      {active ? <><Check className="w-3.5 h-3.5" /> In use</> : "Use"}
                    </Button>
                    {t.author_id !== user?.id && (
                      <Button size="sm" variant="outline" onClick={() => toggleAdd(t)} disabled={busyId === t.id} className="rounded-full gap-1">
                        {busyId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {added ? "Added" : "Add"}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <ThemeCreatorDialog open={creating} onClose={() => setCreating(false)} onCreated={() => { market.refetch(); mine.refetch(); }} />
    </div>
  );
}
