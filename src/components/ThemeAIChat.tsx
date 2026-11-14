import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Send, Loader2, RefreshCw, RotateCcw, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { askThemeAI, modelAvailable, type ThemeChatTurn, type CurrentState } from "@/lib/themeAiRemote";
import { designThemes, THEME_AI_EXAMPLES } from "@/lib/themeAI";
import { applyInstruction, ASSISTANT_EXAMPLES } from "@/lib/themeAssistant";
import { gradientCss, type ThemeDefinition } from "@/lib/customThemes";
import type { ThemeEffects } from "@/lib/themeEffects";
import type { ThemeCustomization } from "@/lib/themeCustomization";
import { springy, snappy } from "@/lib/motion";

export interface ThemePatch {
  definition?: ThemeDefinition;
  effects?: ThemeEffects;
  customization?: ThemeCustomization;
  name?: string;
}

interface Suggestion {
  name: string;
  definition: ThemeDefinition;
  effects?: ThemeEffects;
}

interface Line extends ThemeChatTurn {
  /** A warning rather than an answer: the model could not be reached. */
  warn?: boolean;
}

interface Props {
  state: CurrentState;
  onApply: (patch: ThemePatch) => void;
}

/**
 * UMS Theme AI as a conversation. The same model and key as the AI tab
 * answers; it talks back, remembers the thread, and every change it makes
 * lands on the preview straight away. With no key configured, the
 * on-device assistant answers instead, so it always does something.
 */
export function ThemeAIChat({ state, onApply }: Props) {
  const [thread, setThread] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  // For the on-device designer: what was last asked for, and which take
  const lastMood = useRef<{ prompt: string; variant: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread, busy]);

  const say = (content: string, warn = false) =>
    setThread((prev) => [...prev, { role: "assistant", content, warn }]);

  // The built-in assistant: edits when it understands the words as an
  // instruction, otherwise designs three looks from the mood described.
  const answerOnDevice = (text: string, again = false) => {
    const edit = applyInstruction(text, state);
    if (edit.understood && !again) {
      onApply({ customization: edit.customization, definition: edit.definition, effects: edit.effects });
      say(edit.summary.join(" "));
      return;
    }
    const prompt = again && lastMood.current ? lastMood.current.prompt : text;
    const variant = again && lastMood.current ? lastMood.current.variant + 1 : 0;
    lastMood.current = { prompt, variant };
    const ideas = designThemes(prompt, variant);
    setSuggestions(ideas);
    if (ideas[0]) {
      onApply({ definition: ideas[0].definition, effects: ideas[0].effects, name: state.name ? undefined : ideas[0].name });
      say(`Here are three takes on "${prompt}" — I've put "${ideas[0].name}" on the preview. Tap another to try it, or tell me what to change.`);
    } else {
      say(edit.summary.join(" ") || "I didn't catch that. Try describing a mood, like \"warm sunset by the sea\", or name a part, like \"make the send button red\".");
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    const history: ThemeChatTurn[] = [...thread.filter((l) => !l.warn), { role: "user", content: text }];
    setThread((prev) => [...prev, { role: "user", content: text }]);
    setBusy(true);
    try {
      const remote = modelAvailable() === false ? null : await askThemeAI(history, state);

      if (remote?.failure) {
        say(`I couldn't reach the AI (${remote.failure}). Answering with the built-in assistant instead.`, true);
      }

      if (remote?.configured && !remote.failure) {
        if (remote.provider) setProvider(remote.provider);
        onApply({
          definition: remote.definition,
          effects: remote.effects,
          customization: remote.customization,
          name: remote.name,
        });
        if (remote.definition && remote.alternatives?.length) {
          setSuggestions([
            { name: remote.name || state.name || "This one", definition: remote.definition, effects: remote.effects },
            ...remote.alternatives,
          ]);
        } else if (remote.definition) {
          setSuggestions([]);
        }
        say(remote.reply || (remote.changed > 0 ? `Done — ${remote.changed} change${remote.changed === 1 ? "" : "s"}.` : "Okay."));
        return;
      }

      answerOnDevice(text);
    } finally {
      setBusy(false);
    }
  };

  const tryAgain = () => {
    if (modelAvailable() === false || provider === null && thread.length === 0) {
      answerOnDevice("", true);
      return;
    }
    void send("Show me a different take on the same idea, please.");
  };

  const reset = () => {
    setThread([]);
    setSuggestions([]);
    lastMood.current = null;
    inputRef.current?.focus();
  };

  const designed = suggestions.length > 0 || thread.some((l) => l.role === "assistant" && !l.warn);
  const chips = designed ? ASSISTANT_EXAMPLES.slice(0, 4) : THEME_AI_EXAMPLES.slice(0, 6);
  const label = provider ?? (modelAvailable() === false ? "on your device" : "AI");

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2.5">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <Wand2 className="w-4 h-4 text-primary" /> UMS Theme AI
        <span className="text-[10px] font-medium text-muted-foreground ml-auto px-2 py-0.5 rounded-full bg-accent/70">{label}</span>
        {thread.length > 0 && (
          <button
            type="button"
            onClick={reset}
            title="Start over"
            aria-label="Start over"
            className="w-7 h-7 rounded-full press flex items-center justify-center text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* The conversation */}
      {(thread.length > 0 || busy) && (
        <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-y-contain space-y-1.5 pr-0.5">
          <AnimatePresence initial={false}>
            {thread.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={springy}
                className={`flex ${line.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[88%] px-3 py-1.5 text-[13px] leading-snug whitespace-pre-wrap break-words ${
                    line.role === "user"
                      ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                      : line.warn
                        ? "rounded-2xl rounded-bl-md bg-orange-500/12 text-orange-600 dark:text-orange-300"
                        : "rounded-2xl rounded-bl-md bg-accent/80 text-foreground"
                  }`}
                >
                  {line.content}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
          {busy && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <span className="rounded-2xl rounded-bl-md bg-accent/80 px-3 py-2 flex items-center gap-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                    animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* Looks to pick from */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {suggestions.map((sg, i) => {
              const on = sg.definition === state.definition
                || JSON.stringify(sg.definition) === JSON.stringify(state.definition);
              return (
                <motion.button
                  key={`${sg.name}-${i}`}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  transition={snappy}
                  onClick={() => onApply({ definition: sg.definition, effects: sg.effects, name: sg.name })}
                  className={`rounded-xl p-1.5 text-left transition-all relative ${on ? "ring-2 ring-primary bg-primary/10" : "bg-accent/60 hover:bg-accent"}`}
                >
                  <div className="h-6 rounded-lg mb-1" style={{ background: gradientCss(sg.definition) }} />
                  <div className="text-[11px] font-medium truncate">{sg.name}</div>
                  {on && <Check className="w-3.5 h-3.5 text-primary absolute top-2 right-2 drop-shadow" />}
                </motion.button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={tryAgain}
            disabled={busy}
            className="text-[12px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className="w-3 h-3" /> Try different ideas
          </button>
        </div>
      )}

      {/* Ask */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          placeholder={designed ? "Tell me what to change, or ask me anything…" : "Describe it… e.g. dark purple cyberpunk"}
          className="rounded-xl h-10"
          disabled={busy}
        />
        <Button
          type="button"
          onClick={() => void send(input)}
          disabled={!input.trim() || busy}
          aria-label="Send"
          className="rounded-xl w-10 h-10 p-0 flex-shrink-0"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {chips.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => void send(ex)}
            disabled={busy}
            className="text-[11px] px-2 py-1 rounded-full bg-accent hover:bg-accent/70 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
