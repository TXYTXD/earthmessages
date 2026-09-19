import { useEffect, useMemo, useState } from "react";
import { Sparkles, Upload, Lock, Loader2, Wand2, RefreshCw, ChevronDown, Palette, Play, Volume2, SlidersHorizontal, CornerDownLeft } from "lucide-react";
import {
  BACKGROUNDS, DEFAULT_EFFECTS, MOTION_STYLES, SOUNDS, normalizeEffects, type ThemeEffects,
} from "@/lib/themeEffects";
import { ThemeBackground } from "@/components/ThemeBackground";
import { ThemeAdvancedEditor } from "@/components/ThemeAdvancedEditor";
import { applyInstruction, ASSISTANT_EXAMPLES } from "@/lib/themeAssistant";
import { askThemeAI } from "@/lib/themeAiRemote";
import { countCustomizations, type ThemeCustomization } from "@/lib/themeCustomization";
import { useAmbientSound } from "@/hooks/useAmbientSound";
import { designThemes, THEME_AI_EXAMPLES, type ThemeSuggestion } from "@/lib/themeAI";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useThemeMarket } from "@/hooks/useThemeMarket";
import { DEFAULT_DEFINITION, completeDefinition, gradientCss, bubbleGradientCss, themeVariables, type CustomTheme, type ThemeDefinition } from "@/lib/customThemes";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  /** Pass a theme you made to revise it instead of creating a new one */
  editing?: CustomTheme | null;
}

function ColorField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg bg-accent/60 px-3 py-2">
      <span className="min-w-0">
        <span className="text-[13px] font-medium block truncate">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground block truncate">{hint}</span>}
      </span>
      <span className="flex items-center gap-2 flex-shrink-0">
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

// Live preview of a definition: a tiny mock of the app in the current mode,
// showing each area in the colour the theme gives it.
export function ThemePreview({ definition, mode, name }: { definition: ThemeDefinition; mode: "light" | "dark"; name?: string }) {
  const vars = themeVariables(definition, mode);
  const style = { ...(vars as Record<string, string>) } as React.CSSProperties;
  const v = (k: string, fallback: string) => (vars[k] ? `hsl(${vars[k]})` : fallback);
  const bg = mode === "dark" ? v("--background", "hsl(224 20% 4%)") : "hsl(0 0% 100%)";
  const fg = mode === "dark" ? v("--foreground", "hsl(0 0% 96%)") : "hsl(224 20% 10%)";
  const card = v("--card", mode === "dark" ? "hsl(224 20% 8%)" : "hsl(220 14% 96%)");
  const nav = v("--sidebar-background", card);
  const received = v("--secondary", card);
  const receivedFg = v("--secondary-foreground", fg);

  return (
    <div className="rounded-xl overflow-hidden border border-border flex" style={{ ...style, background: bg, color: fg }}>
      {/* navigation rail — its own colour */}
      <div className="w-8 flex flex-col items-center gap-2 py-2.5" style={{ background: nav }}>
        <div className="w-5 h-5 rounded-lg" style={{ background: gradientCss(definition) }} />
        <div className="w-4 h-4 rounded-md" style={{ background: `hsl(${vars["--primary"]})`, opacity: 0.9 }} />
        <div className="w-4 h-4 rounded-md" style={{ background: fg, opacity: 0.15 }} />
        <div className="w-4 h-4 rounded-md" style={{ background: fg, opacity: 0.15 }} />
      </div>

      <div className="flex-1 min-w-0">
        {/* header — card colour */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: card }}>
          <div className="w-6 h-6 rounded-full" style={{ background: gradientCss(definition) }} />
          <div className="text-[12px] font-semibold truncate">{name || "My theme"}</div>
          <div className="ml-auto w-2 h-2 rounded-full" style={{ background: `hsl(${vars["--primary"]})` }} />
        </div>

        <div className="p-3 space-y-2">
          <div
            className="max-w-[75%] rounded-2xl rounded-bl-md px-3 py-1.5 text-[11px]"
            style={{ background: received, color: receivedFg }}
          >
            Hey! How does this look?
          </div>
          <div
            className="ml-auto max-w-[75%] rounded-2xl rounded-br-md px-3 py-1.5 text-[11px] font-medium text-white"
            style={{ background: bubbleGradientCss(definition) }}
          >
            Looks amazing ✨
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-6 flex-1 rounded-full" style={{ background: received }} />
            <div
              className="h-6 px-3 rounded-full text-[10px] flex items-center font-semibold"
              style={{ background: `hsl(${vars["--primary"]})`, color: `hsl(${vars["--primary-foreground"]})` }}
            >
              Send
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeCreatorDialog({ open, onClose, onCreated, editing }: Props) {
  const { toast } = useToast();
  const { colorMode, setCustomTheme } = useThemeContext();
  const { publish, updateTheme } = useThemeMarket();
  const [name, setName] = useState("");
  const [def, setDef] = useState<ThemeDefinition>(DEFAULT_DEFINITION);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"colours" | "effects" | "advanced">("colours");
  const [customization, setCustomization] = useState<ThemeCustomization>({});
  const [instruction, setInstruction] = useState("");
  const [assistantLog, setAssistantLog] = useState<{ text: string; ok: boolean }[]>([]);
  const [working, setWorking] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [effects, setEffects] = useState<ThemeEffects>(DEFAULT_EFFECTS);
  const [previewSound, setPreviewSound] = useState(false);
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
        if (ideas[0].effects) setEffects(ideas[0].effects);
        if (!name.trim()) setName(ideas[0].name);
      }
    }, 350);
  };
  // The advanced assistant edits this theme from an instruction. A real model
  // handles it when one is configured; otherwise the on-device assistant does,
  // so the feature works either way.
  const runInstruction = async (text: string) => {
    const q = text.trim();
    if (!q || working) return;
    setWorking(true);
    setAssistantLog((prev) => [...prev.slice(-6), { text: `You: ${q}`, ok: true }]);

    try {
      const remote = await askThemeAI(q, { customization, definition: def, effects });

      // Say when the smart assistant could not answer, rather than quietly
      // handing over to the simpler built-in one and looking dim.
      if (remote?.failure) {
        setAssistantLog((prev) => [
          ...prev.slice(-6),
          { text: `The AI couldn't answer (${remote.failure}). Using the built-in assistant instead.`, ok: false },
        ]);
      }

      if (remote?.configured && !remote.failure && (remote.changed > 0 || remote.reply)) {
        if (remote.customization) setCustomization(remote.customization);
        if (remote.effects) setEffects(remote.effects);
        if (remote.definition) setDef(remote.definition);
        setAssistantLog((prev) => [
          ...prev.slice(-6),
          { text: remote.reply || `Done — ${remote.changed} change${remote.changed === 1 ? "" : "s"}.`, ok: true },
        ]);
        setInstruction("");
        return;
      }

      const result = applyInstruction(q, { customization, definition: def, effects });
      if (result.customization) setCustomization(result.customization);
      if (result.effects) setEffects(result.effects);
      if (result.definition) setDef(result.definition);
      setAssistantLog((prev) => [
        ...prev.slice(-6),
        ...result.summary.map((line) => ({ text: line, ok: result.understood })),
      ]);
      if (result.understood) setInstruction("");
    } finally {
      setWorking(false);
    }
  };

  const generateAgain = () => {
    const v = variant + 1;
    setVariant(v);
    generate(prompt, v);
  };

  // Load whatever is being edited each time the dialog opens
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setDef(editing.definition);
      setEffects(normalizeEffects(editing.effects));
      setCustomization(editing.customization ?? {});
    } else {
      setName("");
      setDef(DEFAULT_DEFINITION);
      setEffects(DEFAULT_EFFECTS);
      setCustomization({});
    }
    setAssistantLog([]);
    setInstruction("");
  }, [open, editing]);

  const previewMode = useMemo(() => colorMode, [colorMode]);
  // Every role resolved, so the editor can show a colour for roles the
  // theme hasn't set explicitly yet.
  const full = useMemo(() => completeDefinition(def), [def]);
  const effectColors = useMemo(
    () => [...def.gradient, full.bubble[0], full.bubble[1]],
    [def.gradient, full.bubble]
  );
  // Hear the ambience while choosing it, only while this dialog is open
  useAmbientSound(effects.sound, effects.soundVolume, open && previewSound);

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
    const n = (x: number) => ((x % 360) + 360) % 360;
    setDef({
      primary: hex(h, 85, 55),
      gradient: [hex(n(h + 320), 75, 58), hex(h, 90, 55), hex(n(h + 40), 90, 55)],
      tint: hex(h, 60, 30),
      bubble: [hex(n(h - 12), 88, 56), hex(n(h + 34), 84, 50)],
      received: hex(n(h + 18), 22, 17),
      sidebar: hex(n(h - 14), 28, 8),
      surface: hex(n(h + 8), 22, 12),
    });
  };

  const changedCount = countCustomizations(customization);

  const save = async (isPublic: boolean) => {
    if (!name.trim()) {
      toast({ title: "Give your theme a name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const saved = editing
        ? await updateTheme(editing.id, { name, definition: def, effects, customization, isPublic })
        : await publish(name, def, isPublic, effects, customization);
      if (saved) {
        setCustomTheme(saved.id, saved.definition, saved.effects ?? effects, saved.customization ?? customization);
        toast({
          title: editing
            ? "Theme updated"
            : isPublic
              ? "Published to the Theme Market"
              : "Theme saved",
          description: editing
            ? `Everyone using "${saved.name}" gets your changes.`
            : isPublic
              ? `"${saved.name}" is now live for everyone.`
              : `"${saved.name}" is in your themes.`,
        });
        onCreated?.();
        onClose();
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
            <Sparkles className="w-5 h-5 text-primary" /> {editing ? `Edit "${editing.name}"` : "Create your theme"}
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
                      onClick={() => { setDef(sg.definition); setName(sg.name); if (sg.effects) setEffects(sg.effects); }}
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

          <div className="relative rounded-xl overflow-hidden">
            {effects.background !== "none" && (
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <ThemeBackground kind={effects.background} intensity={effects.backgroundIntensity} colors={effectColors} />
              </div>
            )}
            <div className="relative">
              <ThemePreview definition={def} mode={previewMode} name={name} />
            </div>
          </div>

          {/* Colours / Effects */}
          <div className="flex rounded-full bg-accent/60 p-1">
            {([
              { id: "colours", label: "Colours", icon: <Palette className="w-3.5 h-3.5" /> },
              { id: "effects", label: "Animation & sound", icon: <Play className="w-3.5 h-3.5" /> },
              { id: "advanced", label: "Advanced", icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
            ] as const).map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setTab(x.id)}
                className={`flex-1 px-2 py-1.5 rounded-full text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                  tab === x.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {x.icon} {x.label}
              </button>
            ))}
          </div>

          {tab === "advanced" ? (
            <div className="space-y-3">
              {/* The assistant that edits this theme for you */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <Wand2 className="w-4 h-4 text-primary" /> Tell me what to change
                  <span className="text-[10px] font-medium text-muted-foreground ml-auto">runs on your device</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void runInstruction(instruction); } }}
                    placeholder="Tell it anything — e.g. make it feel like a thunderstorm"
                    className="rounded-lg"
                  />
                  <Button type="button" onClick={() => runInstruction(instruction)} disabled={!instruction.trim() || working} className="rounded-lg gap-1.5 flex-shrink-0">
                    {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4" />} Do it
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ASSISTANT_EXAMPLES.slice(0, 5).map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => void runInstruction(ex)}
                      className="text-[11px] px-2 py-1 rounded-full bg-accent hover:bg-accent/70 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                {assistantLog.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {assistantLog.map((line, i) => (
                      <p
                        key={i}
                        className={`text-[11px] leading-snug ${
                          line.text.startsWith("You: ")
                            ? "text-muted-foreground"
                            : line.ok
                              ? "text-foreground"
                              : "text-orange-500"
                        }`}
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <ThemeAdvancedEditor
                customization={customization}
                onChange={setCustomization}
                palette={[def.primary, ...def.gradient, full.bubble[0], full.bubble[1], full.received, full.sidebar, full.surface]}
              />
            </div>
          ) : tab === "effects" ? (
            <div className="space-y-3">
              <div>
                <p className="text-[13px] font-medium mb-1.5">How the app moves</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {MOTION_STYLES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      title={m.hint}
                      onClick={() => setEffects({ ...effects, motion: m.id })}
                      className={`px-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        effects.motion === m.id ? "ring-2 ring-primary bg-primary/10" : "bg-accent/60 hover:bg-accent"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {MOTION_STYLES.find((m) => m.id === effects.motion)?.hint}
                </p>
              </div>

              <div>
                <p className="text-[13px] font-medium mb-1.5">Background animation</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {BACKGROUNDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setEffects({ ...effects, background: b.id })}
                      className={`px-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        effects.background === b.id ? "ring-2 ring-primary bg-primary/10" : "bg-accent/60 hover:bg-accent"
                      }`}
                    >
                      <span className="block text-base leading-tight">{b.emoji}</span>
                      <span className="block truncate">{b.label}</span>
                    </button>
                  ))}
                </div>
                {effects.background !== "none" && (
                  <label className="block mt-2">
                    <span className="text-[11px] text-muted-foreground">Strength — {effects.backgroundIntensity}%</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={effects.backgroundIntensity}
                      onChange={(e) => setEffects({ ...effects, backgroundIntensity: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </label>
                )}
              </div>

              <div>
                <p className="text-[13px] font-medium mb-1.5">Background sound</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {SOUNDS.map((sd) => (
                    <button
                      key={sd.id}
                      type="button"
                      onClick={() => setEffects({ ...effects, sound: sd.id })}
                      className={`px-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        effects.sound === sd.id ? "ring-2 ring-primary bg-primary/10" : "bg-accent/60 hover:bg-accent"
                      }`}
                    >
                      <span className="block text-base leading-tight">{sd.emoji}</span>
                      <span className="block truncate">{sd.label}</span>
                    </button>
                  ))}
                </div>
                {effects.sound !== "none" && (
                  <>
                    <label className="block mt-2">
                      <span className="text-[11px] text-muted-foreground">Volume — {effects.soundVolume}%</span>
                      <input
                        type="range"
                        min={5}
                        max={100}
                        value={effects.soundVolume}
                        onChange={(e) => setEffects({ ...effects, soundVolume: Number(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPreviewSound((v) => !v)}
                      className="text-[12px] text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> {previewSound ? "Stop listening" : "Listen"}
                    </button>
                  </>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                These travel with your theme. Anyone who uses it gets the same motion and background — sound only
                starts if they turn it on in their own settings.
              </p>
            </div>
          ) : (
          <div className="space-y-3">
          {/* The colours most people care about */}
          <ColorField label="Accent" hint="Buttons, links, highlights" value={def.primary} onChange={(v) => setDef({ ...def, primary: v })} />
          <ColorField label="Your bubbles (start)" hint="Messages you send" value={full.bubble[0]} onChange={(v) => setDef({ ...def, bubble: [v, full.bubble[1]] })} />
          <ColorField label="Your bubbles (end)" hint="The other end of the fade" value={full.bubble[1]} onChange={(v) => setDef({ ...def, bubble: [full.bubble[0], v] })} />
          <ColorField label="Their bubbles" hint="Messages you receive" value={full.received} onChange={(v) => setDef({ ...def, received: v })} />

          <button
            type="button"
            onClick={() => setShowAdvanced((a) => !a)}
            className="w-full flex items-center justify-between text-[13px] font-medium px-1 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>More colours — navigation, cards, logo</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </button>

          {showAdvanced && (
            <div className="space-y-2">
              <ColorField label="Navigation bar" hint="The side and bottom bar" value={full.sidebar} onChange={(v) => setDef({ ...def, sidebar: v })} />
              <ColorField label="Cards & panels" hint="Chat list, settings cards" value={full.surface} onChange={(v) => setDef({ ...def, surface: v })} />
              <ColorField label="Logo gradient start" hint="Avatars and the logo" value={def.gradient[0]} onChange={(v) => setDef({ ...def, gradient: [v, def.gradient[1], def.gradient[2]] })} />
              <ColorField label="Logo gradient middle" hint="Avatars and the logo" value={def.gradient[1]} onChange={(v) => setDef({ ...def, gradient: [def.gradient[0], v, def.gradient[2]] })} />
              <ColorField label="Logo gradient end" hint="Avatars and the logo" value={def.gradient[2]} onChange={(v) => setDef({ ...def, gradient: [def.gradient[0], def.gradient[1], v] })} />
              <ColorField label="Background tint" hint="The dark background colour" value={def.tint} onChange={(v) => setDef({ ...def, tint: v })} />
            </div>
          )}

          <button type="button" onClick={randomize} className="text-[12px] text-primary hover:underline">🎲 Surprise me</button>
          </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={() => save(true)} disabled={saving} className="rounded-full gap-2 flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{" "}
            {editing ? "Save changes" : `Publish${changedCount ? ` (${changedCount} tweaks)` : " to Theme Market"}`}
          </Button>
          <Button onClick={() => save(false)} disabled={saving} variant="outline" className="rounded-full gap-2">
            <Lock className="w-4 h-4" /> {editing ? "Save as private" : "Keep private"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
