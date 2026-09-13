import { useMemo, useState } from "react";
import { Sparkles, Upload, Lock, Loader2, Wand2, RefreshCw } from "lucide-react";
import { designThemes, THEME_AI_EXAMPLES, type ThemeSuggestion } from "@/lib/themeAI";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useThemeMarket } from "@/hooks/useThemeMarket";
import { DEFAULT_DEFINITION, gradientCss, themeVariables, type ThemeDefinition } from "@/lib/customThemes";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg bg-accent/60 px-3 py-2">
      <span className="text-[13px] font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground font-mono uppercase">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-md border border-border bg-transparent cursor-pointer p-0.5"
        />
      </span>
    </label>
  );
}

// Live preview of a definition: a tiny mock of the app in the current mode
export function ThemePreview({ definition, mode, name }: { definition: ThemeDefinition; mode: "light" | "dark"; name?: string }) {
  const vars = themeVariables(definition, mode);
  const style = { ...(vars as Record<string, string>) } as React.CSSProperties;
  const bg = mode === "dark" ? `hsl(${vars["--background"]})` : "hsl(0 0% 100%)";
  const fg = mode === "dark" ? `hsl(${vars["--foreground"]})` : "hsl(224 20% 10%)";
  const card = mode === "dark" ? `hsl(${vars["--card"]})` : "hsl(220 14% 96%)";
  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ ...style, background: bg, color: fg }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: card }}>
        <div className="w-6 h-6 rounded-full" style={{ background: gradientCss(definition) }} />
        <div className="text-[12px] font-semibold truncate">{name || "My theme"}</div>
        <div className="ml-auto w-2 h-2 rounded-full" style={{ background: `hsl(${vars["--primary"]})` }} />
      </div>
      <div className="p-3 space-y-2">
        <div className="max-w-[70%] rounded-2xl rounded-bl-md px-3 py-1.5 text-[11px]" style={{ background: card }}>
          Hey! How does this look?
        </div>
        <div
          className="ml-auto max-w-[70%] rounded-2xl rounded-br-md px-3 py-1.5 text-[11px] font-medium"
          style={{ background: `hsl(${vars["--primary"]})`, color: `hsl(${vars["--primary-foreground"]})` }}
        >
          Looks amazing ✨
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-6 flex-1 rounded-full" style={{ background: gradientCss(definition) }} />
          <div className="h-6 px-3 rounded-full text-[10px] flex items-center font-semibold" style={{ background: `hsl(${vars["--primary"]})`, color: `hsl(${vars["--primary-foreground"]})` }}>
            Send
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeCreatorDialog({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const { colorMode, setCustomTheme } = useThemeContext();
  const { publish } = useThemeMarket();
  const [name, setName] = useState("");
  const [def, setDef] = useState<ThemeDefinition>(DEFAULT_DEFINITION);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [variant, setVariant] = useState(0);
  const [suggestions, setSuggestions] = useState<ThemeSuggestion[]>([]);
  const [thinking, setThinking] = useState(false);

  // UMS Theme AI: runs entirely on the device
  const generate = (text: string, nextVariant = variant) => {
    const q = text.trim();
    if (!q) return;
    setThinking(true);
    // A short pause so the result feels considered and the UI can animate
    setTimeout(() => {
      const ideas = designThemes(q, nextVariant);
      setSuggestions(ideas);
      setThinking(false);
      if (ideas[0]) {
        setDef(ideas[0].definition);
        if (!name.trim()) setName(ideas[0].name);
      }
    }, 350);
  };
  const generateAgain = () => {
    const v = variant + 1;
    setVariant(v);
    generate(prompt, v);
  };

  const previewMode = useMemo(() => colorMode, [colorMode]);

  const randomize = () => {
    const h = Math.floor(Math.random() * 360);
    const hex = (hh: number, sPct: number, lPct: number) => {
      const s = sPct / 100;
      const l = lPct / 100;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + hh / 30) % 12;
        const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(255 * c).toString(16).padStart(2, "0");
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };
    setDef({
      primary: hex(h, 85, 55),
      gradient: [hex((h + 320) % 360, 75, 58), hex(h, 90, 55), hex((h + 40) % 360, 90, 55)],
      tint: hex(h, 60, 30),
    });
  };

  const save = async (isPublic: boolean) => {
    if (!name.trim()) {
      toast({ title: "Give your theme a name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await publish(name, def, isPublic);
      if (created) {
        setCustomTheme(created.id, created.definition);
        toast({
          title: isPublic ? "Published to the Theme Market" : "Theme saved",
          description: isPublic ? `"${created.name}" is now live for everyone.` : `"${created.name}" is in your themes.`,
        });
        onCreated?.();
        onClose();
        setName("");
        setDef(DEFAULT_DEFINITION);
      }
    } catch (e: any) {
      toast({ title: "Couldn't save theme", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Create your theme
          </DialogTitle>
          <DialogDescription>Pick your colors, watch the preview, then keep it or share it on the Theme Market.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* UMS Theme AI */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <Wand2 className="w-4 h-4 text-primary" /> UMS Theme AI
              <span className="text-[10px] font-medium text-muted-foreground ml-auto">runs on your device</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); generate(prompt); } }}
                placeholder="Describe it… e.g. dark purple cyberpunk"
                className="rounded-lg"
              />
              <Button type="button" onClick={() => generate(prompt)} disabled={!prompt.trim() || thinking} className="rounded-lg gap-1.5 flex-shrink-0">
                {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Design
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {THEME_AI_EXAMPLES.slice(0, 6).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => { setPrompt(ex); generate(ex, 0); setVariant(0); }}
                  className="text-[11px] px-2 py-1 rounded-full bg-accent hover:bg-accent/70 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
            {suggestions.length > 0 && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  {suggestions.map((sg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setDef(sg.definition); setName(sg.name); }}
                      title={sg.reason}
                      className={`rounded-lg p-1.5 text-left transition-all ${def === sg.definition ? "ring-2 ring-primary bg-primary/10" : "bg-accent/60 hover:bg-accent"}`}
                    >
                      <div className="h-5 rounded-md mb-1" style={{ background: gradientCss(sg.definition) }} />
                      <div className="text-[11px] font-medium truncate">{sg.name}</div>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={generateAgain} className="text-[12px] text-primary hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Try different ideas
                </button>
              </div>
            )}
          </div>

          <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Theme name" className="rounded-lg" />
          <ThemePreview definition={def} mode={previewMode} name={name} />
          <ColorField label="Accent color" value={def.primary} onChange={(v) => setDef({ ...def, primary: v })} />
          <ColorField label="Gradient start" value={def.gradient[0]} onChange={(v) => setDef({ ...def, gradient: [v, def.gradient[1], def.gradient[2]] })} />
          <ColorField label="Gradient middle" value={def.gradient[1]} onChange={(v) => setDef({ ...def, gradient: [def.gradient[0], v, def.gradient[2]] })} />
          <ColorField label="Gradient end" value={def.gradient[2]} onChange={(v) => setDef({ ...def, gradient: [def.gradient[0], def.gradient[1], v] })} />
          <ColorField label="Dark background tint" value={def.tint} onChange={(v) => setDef({ ...def, tint: v })} />
          <button onClick={randomize} className="text-[12px] text-primary hover:underline">🎲 Surprise me</button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={() => save(true)} disabled={saving} className="rounded-full gap-2 flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Publish to Theme Market
          </Button>
          <Button onClick={() => save(false)} disabled={saving} variant="outline" className="rounded-full gap-2">
            <Lock className="w-4 h-4" /> Keep private
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
