import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { ChevronLeft, Check, Volume2, Sparkles, RotateCcw, Search, Globe, Loader2, Play } from "lucide-react";
import {
  isLibrarySoundRef, playLibrarySound, searchSounds, soundRefUrl, toSoundRef, type LibrarySound,
} from "@/lib/soundLibrary";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ELEMENTS, ELEMENT_ANIMATIONS, ELEMENT_GROUPS, ICON_CHOICES,
  type ElementSpec,
} from "@/lib/themeElements";
import { UI_SOUNDS, playUISound, unlockUISounds } from "@/lib/uiSounds";
import { countCustomizations, type ElementStyle, type ThemeCustomization } from "@/lib/themeCustomization";

interface Props {
  customization: ThemeCustomization;
  onChange: (next: ThemeCustomization) => void;
  /** Colours from the theme, offered as quick picks */
  palette: string[];
}

const LucideIcon = ({ name, className }: { name: string; className?: string }) => {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return C ? <C className={className} /> : null;
};

// Pick any element of UMS and change its colour, icon, sound and animation.
export function ThemeAdvancedEditor({ customization, onChange, palette }: Props) {
  const [selected, setSelected] = useState<ElementSpec | null>(null);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ELEMENT_GROUPS.map((g) => ({
      name: g,
      items: ELEMENTS.filter(
        (e) => e.group === g && (!q || e.label.toLowerCase().includes(q) || e.hint.toLowerCase().includes(q))
      ),
    })).filter((g) => g.items.length);
  }, [query]);

  const update = (id: string, patch: Partial<ElementStyle>) => {
    const next = { ...customization };
    const merged = { ...(next[id] ?? {}), ...patch };
    // Dropping every property removes the override entirely
    Object.keys(merged).forEach((k) => {
      if (merged[k as keyof ElementStyle] === undefined) delete merged[k as keyof ElementStyle];
    });
    if (Object.keys(merged).length) next[id] = merged;
    else delete next[id];
    onChange(next);
  };

  if (selected) {
    const style = customization[selected.id] ?? {};
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" /> All elements
        </button>

        <div>
          <p className="text-[15px] font-semibold">{selected.label}</p>
          <p className="text-[12px] text-muted-foreground">{selected.hint}</p>
        </div>

        {selected.traits.includes("color") && (
          <Swatches
            label="Colour"
            value={style.color}
            palette={palette}
            onPick={(c) => update(selected.id, { color: c })}
          />
        )}

        {selected.traits.includes("background") && (
          <Swatches
            label="Background"
            value={style.background}
            palette={palette}
            onPick={(c) => update(selected.id, { background: c })}
          />
        )}

        {selected.traits.includes("icon") && (
          <div>
            <p className="text-[12px] font-medium mb-1.5">Icon</p>
            <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto pr-0.5">
              <button
                type="button"
                onClick={() => update(selected.id, { icon: undefined })}
                className={`h-9 rounded-lg text-[10px] flex items-center justify-center transition-all ${
                  !style.icon ? "ring-2 ring-primary bg-primary/10" : "bg-accent/60 hover:bg-accent"
                }`}
              >
                Default
              </button>
              {ICON_CHOICES.map((name) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => update(selected.id, { icon: name })}
                  className={`h-9 rounded-lg flex items-center justify-center transition-all ${
                    style.icon === name ? "ring-2 ring-primary bg-primary/10" : "bg-accent/60 hover:bg-accent"
                  }`}
                >
                  <LucideIcon name={name} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        )}

        {selected.traits.includes("sound") && (
          <div>
            <p className="text-[12px] font-medium mb-1.5">Sound</p>
            <div className="grid grid-cols-4 gap-1.5">
              {UI_SOUNDS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    unlockUISounds();
                    update(selected.id, { sound: s.id === "none" ? undefined : s.id });
                    playUISound(s.id);
                  }}
                  className={`px-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    !isLibrarySoundRef(style.sound) && (style.sound ?? "none") === s.id
                      ? "ring-2 ring-primary bg-primary/10"
                      : "bg-accent/60 hover:bg-accent"
                  }`}
                >
                  <span className="block text-sm leading-tight">{s.emoji}</span>
                  <span className="block truncate">{s.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Tap one to hear it
            </p>
            <SoundLibraryPicker
              value={style.sound}
              onPick={(ref) => update(selected.id, { sound: ref })}
            />
          </div>
        )}

        {selected.traits.includes("animation") && (
          <div>
            <p className="text-[12px] font-medium mb-1.5">Animation</p>
            <div className="grid grid-cols-5 gap-1.5">
              {ELEMENT_ANIMATIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => update(selected.id, { animation: a.id === "none" ? undefined : a.id })}
                  className={`px-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                    (style.animation ?? "none") === a.id ? "ring-2 ring-primary bg-primary/10" : "bg-accent/60 hover:bg-accent"
                  } ${a.id !== "none" ? `el-anim el-anim-${a.id}` : ""}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {Object.keys(style).length > 0 && (
          <button
            type="button"
            onClick={() => update(selected.id, { color: undefined, background: undefined, icon: undefined, sound: undefined, animation: undefined })}
            className="text-[12px] text-destructive hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset this element
          </button>
        )}
      </div>
    );
  }

  const changed = countCustomizations(customization);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-accent/60 rounded-full px-3 py-1.5">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a button, tab, bubble…"
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>

      {changed > 0 && (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-primary font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> {changed} element{changed === 1 ? "" : "s"} changed
          </span>
          <button type="button" onClick={() => onChange({})} className="text-destructive hover:underline">
            Reset all
          </button>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.name}>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{g.name}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {g.items.map((el) => {
              const style = customization[el.id];
              const touched = !!style && Object.keys(style).length > 0;
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => setSelected(el)}
                  className={`text-left px-2.5 py-2 rounded-lg transition-all ${
                    touched ? "ring-1 ring-primary/60 bg-primary/5" : "bg-accent/60 hover:bg-accent"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {style?.icon && <LucideIcon name={style.icon} className="w-3.5 h-3.5 flex-shrink-0" />}
                    {(style?.color || style?.background) && (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 border border-border"
                        style={{ background: style.background ?? style.color }}
                      />
                    )}
                    <span className="text-[12px] font-medium truncate">{el.label}</span>
                    {touched && <Check className="w-3 h-3 text-primary ml-auto flex-shrink-0" />}
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">{el.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <p className="text-[13px] text-muted-foreground text-center py-6">Nothing matches "{query}"</p>
      )}
    </div>
  );
}

function Swatches({
  label, value, palette, onPick,
}: { label: string; value?: string; palette: string[]; onPick: (c: string | undefined) => void }) {
  const choices = useMemo(() => {
    const extra = ["#ffffff", "#e2e8f0", "#64748b", "#0f172a", "#ef4444", "#f97316", "#eab308",
      "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"];
    return [...new Set([...palette, ...extra])].slice(0, 20);
  }, [palette]);

  return (
    <div>
      <p className="text-[12px] font-medium mb-1.5">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPick(undefined)}
          className={`px-2 h-8 rounded-lg text-[10px] font-medium transition-all ${
            !value ? "ring-2 ring-primary bg-primary/10" : "bg-accent/60 hover:bg-accent"
          }`}
        >
          Default
        </button>
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className={`w-8 h-8 rounded-lg border border-border transition-all ${
              value?.toLowerCase() === c.toLowerCase() ? "ring-2 ring-primary scale-110" : "hover:scale-105"
            }`}
            style={{ background: c }}
          />
        ))}
        <label className="w-8 h-8 rounded-lg border border-border overflow-hidden cursor-pointer relative">
          <input
            type="color"
            value={value ?? "#3b82f6"}
            onChange={(e) => onPick(e.target.value)}
            className="absolute inset-0 w-[200%] h-[200%] -left-1/2 -top-1/2 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}


// Search Wikimedia Commons for a real recording and attach it to an element.
// Free, openly licensed, and no account needed.
function SoundLibraryPicker({
  value, onPick,
}: { value?: string; onPick: (ref: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibrarySound[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = isLibrarySoundRef(value) ? value : null;

  const run = async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      setResults(await searchSounds(q));
    } catch {
      setError("Couldn't reach the sound library");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-border p-2 space-y-2">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !results.length) void run("");
        }}
        className="flex items-center gap-1.5 text-[12px] font-medium w-full"
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        Sounds from the internet
        <span className="ml-auto text-[10px] text-muted-foreground">{open ? "Hide" : "Browse"}</span>
      </button>

      {chosen && (
        <div className="flex items-center gap-1.5 text-[11px] bg-primary/10 rounded-md px-2 py-1">
          <Check className="w-3 h-3 text-primary flex-shrink-0" />
          <span className="truncate flex-1">{decodeURIComponent(soundRefUrl(chosen)?.split("/").pop() ?? "")}</span>
          <button type="button" onClick={() => void playLibrarySound(chosen)} className="text-primary">
            <Play className="w-3 h-3" />
          </button>
          <button type="button" onClick={() => onPick(undefined)} className="text-destructive">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      )}

      {open && (
        <>
          <div className="flex items-center gap-2 bg-accent/60 rounded-full px-2.5 py-1">
            <Search className="w-3 h-3 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void run(query); } }}
              placeholder="bell, click, water, cat…"
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </div>

          {error && <p className="text-[11px] text-destructive">{error}</p>}

          {!loading && !error && results.length === 0 && (
            <p className="text-[11px] text-muted-foreground">No short clips found. Try another word.</p>
          )}

          <div className="space-y-1 max-h-40 overflow-y-auto">
            {results.map((snd) => (
              <div
                key={snd.id}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
                  chosen === toSoundRef(snd.url) ? "bg-primary/10" : "hover:bg-accent/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => void playLibrarySound(toSoundRef(snd.url))}
                  className="text-primary flex-shrink-0"
                  title="Listen"
                >
                  <Play className="w-3 h-3" />
                </button>
                <span className="text-[11px] truncate flex-1" title={snd.title}>{snd.title}</span>
                {snd.seconds > 0 && <span className="text-[10px] text-muted-foreground">{snd.seconds}s</span>}
                <button
                  type="button"
                  onClick={() => onPick(toSoundRef(snd.url))}
                  className="text-[10px] font-medium text-primary hover:underline flex-shrink-0"
                >
                  Use
                </button>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            From Wikimedia Commons — free to use and credited to their creators. Only short clips are offered, so
            buttons stay quick.
          </p>
        </>
      )}
    </div>
  );
}
