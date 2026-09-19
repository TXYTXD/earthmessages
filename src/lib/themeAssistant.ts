// The advanced half of UMS Theme AI: instead of designing a whole theme
// from a mood, it takes instructions about *this* theme and carries them
// out — "make the send button red with a pop sound", "give every tab a
// bounce", "put a rocket on the AI tab". Still entirely on the device.

import { ELEMENTS, ELEMENT_ANIMATIONS, ICON_CHOICES, type ElementAnimation, type IconName } from "@/lib/themeElements";
import { UI_SOUNDS, type UISoundName } from "@/lib/uiSounds";
import { hslToHex } from "@/lib/themeAI";
import type { ElementStyle, ThemeCustomization } from "@/lib/themeCustomization";
import type { ThemeDefinition } from "@/lib/customThemes";
import {
  BACKGROUNDS, MOTION_STYLES, SOUNDS,
  type BackgroundKind, type MotionStyle, type ThemeEffects, type AmbientSound,
} from "@/lib/themeEffects";

export interface AssistantResult {
  /** What changed, in plain words, for the person to read */
  summary: string[];
  customization?: ThemeCustomization;
  definition?: ThemeDefinition;
  effects?: ThemeEffects;
  /** Nothing matched — say so rather than pretending */
  understood: boolean;
}

// ---- words → colours ------------------------------------------------------
const NAMED_COLORS: Record<string, string> = {
  red: "#ef4444", crimson: "#dc2626", scarlet: "#f43f5e", cherry: "#e11d48",
  pink: "#ec4899", rose: "#f43f5e", magenta: "#d946ef", fuchsia: "#e879f9",
  purple: "#a855f7", violet: "#8b5cf6", lavender: "#c4b5fd", indigo: "#6366f1",
  blue: "#3b82f6", navy: "#1e3a8a", sky: "#0ea5e9", azure: "#0284c7", cobalt: "#1d4ed8",
  cyan: "#06b6d4", teal: "#14b8a6", turquoise: "#2dd4bf", aqua: "#22d3ee",
  mint: "#6ee7b7", green: "#22c55e", emerald: "#10b981", lime: "#84cc16", forest: "#15803d",
  yellow: "#eab308", gold: "#f59e0b", amber: "#f59e0b", orange: "#f97316", tangerine: "#fb923c",
  peach: "#fdba74", coral: "#fb7185", salmon: "#fca5a5",
  brown: "#92400e", coffee: "#78350f", chocolate: "#7c2d12", tan: "#d6a77a",
  white: "#f8fafc", silver: "#cbd5e1", gray: "#64748b", grey: "#64748b",
  black: "#0f172a", charcoal: "#1e293b",
  // Greek
  "κόκκινο": "#ef4444", "κοκκινο": "#ef4444", "ροζ": "#ec4899", "μωβ": "#a855f7", "μοβ": "#a855f7",
  "μπλε": "#3b82f6", "γαλάζιο": "#0ea5e9", "γαλαζιο": "#0ea5e9", "πράσινο": "#22c55e", "πρασινο": "#22c55e",
  "κίτρινο": "#eab308", "κιτρινο": "#eab308", "πορτοκαλί": "#f97316", "πορτοκαλι": "#f97316",
  "χρυσό": "#f59e0b", "χρυσο": "#f59e0b", "άσπρο": "#f8fafc", "ασπρο": "#f8fafc",
  "μαύρο": "#0f172a", "μαυρο": "#0f172a", "γκρι": "#64748b", "καφέ": "#92400e", "καφε": "#92400e",
};

// ---- words → elements -----------------------------------------------------
// Each element gets the phrases a person would actually say for it.
const ELEMENT_WORDS: Record<string, string[]> = {
  "button.send": ["send button", "send", "send key", "κουμπί αποστολής", "αποστολη"],
  "button.emoji": ["emoji button", "emoji", "smiley", "emojis"],
  "button.attach": ["attach button", "attach", "attachment", "paperclip", "file button", "photo button"],
  "button.mic": ["mic button", "mic", "microphone", "voice button", "record button"],
  "button.gif": ["gif button", "gif", "gifs"],
  "button.primary": ["buttons", "main buttons", "all buttons", "primary button", "κουμπιά", "κουμπια"],
  "input.box": ["message box", "text box", "input", "typing box", "where i type"],
  "bubble.sent": ["my bubbles", "my messages", "sent bubbles", "sent messages", "my bubble", "τα μηνύματά μου"],
  "bubble.received": ["their bubbles", "their messages", "received messages", "incoming messages", "received bubbles"],
  "message.reaction": ["reactions", "reaction", "emoji reactions"],
  "message.typing": ["typing dots", "typing indicator", "typing"],
  "message.time": ["timestamps", "timestamp", "message time"],
  "nav.bar": ["nav bar", "navigation bar", "navbar", "bottom bar", "side bar", "sidebar", "μπάρα"],
  "nav.active": ["selected tab", "active tab", "current tab", "selected"],
  "nav.idle": ["other tabs", "inactive tabs", "unselected tabs"],
  "nav.chats": ["chats tab", "chat tab", "chats icon", "chats"],
  "nav.stories": ["stories tab", "stories icon", "stories"],
  "nav.communities": ["communities tab", "groups tab", "communities", "groups"],
  "nav.calls": ["calls tab", "calls icon", "calls", "phone tab"],
  "nav.ai": ["ai tab", "ai icon", "ai button", "ai"],
  "nav.calendar": ["calendar tab", "calendar icon", "calendar", "plan tab"],
  "nav.settings": ["settings tab", "settings icon", "settings"],
  "nav.account": ["account tab", "profile tab", "account icon", "account", "profile"],
  "nav.logo": ["logo", "app icon", "the mark", "λογότυπο"],
  "list.row": ["chat rows", "chat list", "conversation list", "rows"],
  "list.active": ["open chat", "selected chat", "active chat"],
  "list.unread": ["unread badge", "unread", "badge", "counter"],
  "list.online": ["online dot", "online indicator", "online"],
  "avatar.ring": ["avatars", "avatar", "profile pictures", "profile circles"],
  "call.answer": ["answer button", "accept button", "answer", "pick up"],
  "call.decline": ["decline button", "reject button", "hang up", "decline"],
  "call.control": ["call controls", "call buttons", "mute button", "camera button"],
  "surface.card": ["cards", "panels", "card"],
  "surface.header": ["chat header", "header", "top bar"],
  "surface.dialog": ["popups", "pop ups", "dialogs", "sheets", "popup"],
  "surface.toast": ["notifications", "toasts", "toast", "alerts"],
};

// Groups people refer to as a whole
const GROUP_WORDS: Record<string, string[]> = {
  Navigation: ["tabs", "all tabs", "every tab", "navigation", "nav", "the tabs", "καρτέλες"],
  Messages: ["messages", "all messages", "bubbles", "all bubbles", "μηνύματα"],
  Buttons: ["all buttons", "every button", "buttons"],
  "Chat list": ["chat list", "conversations"],
  Calls: ["call screen", "calls screen", "call buttons"],
  Surfaces: ["surfaces", "panels", "backgrounds"],
};

const ALL = ["everything", "all of it", "the whole app", "every element", "all elements", "όλα"];

function norm(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s#]/gu, " ").replace(/\s+/g, " ").trim();
}

// Whole-word match that also works for Greek. JavaScript's \b only knows
// ASCII letters, so it never fires between a space and "κ".
function phraseIndex(haystack: string, phrase: string): number {
  const isLetter = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(phrase, from);
    if (i < 0) return -1;
    if (!isLetter(haystack[i - 1]) && !isLetter(haystack[i + phrase.length])) return i;
    from = i + 1;
  }
}

function hasPhrase(haystack: string, phrase: string): boolean {
  return phraseIndex(haystack, phrase) >= 0;
}

function findColor(text: string): string | null {
  const hex = text.match(/#[0-9a-f]{6}\b/i);
  if (hex) return hex[0].toLowerCase();
  // longest name first, so "dark blue" prefers "blue" over nothing
  const words = norm(text).split(" ");
  for (const w of words) if (NAMED_COLORS[w]) {
    void 0;
    const base = NAMED_COLORS[w];
    if (words.includes("dark") || words.includes("σκούρο") || words.includes("σκουρο")) return shade(base, -22);
    if (words.includes("light") || words.includes("ανοιχτό") || words.includes("ανοιχτο")) return shade(base, 18);
    return base;
  }
  return null;
}

// Move a hex colour lighter or darker without losing its hue
function shade(hex: string, deltaL: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  let sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return hslToHex(h, sat * 100, Math.min(92, Math.max(8, l * 100 + deltaL)));
}

// Some words name both a sound and an animation ("pop"). The word right
// after it decides which one was meant.
function qualifierAfter(t: string, word: string): "sound" | "animation" | null {
  const i = phraseIndex(t, word);
  if (i < 0) return null;
  const rest = t.slice(i + word.length, i + word.length + 14);
  if (/^\s*(sound|noise|ήχο|ηχο)/.test(rest)) return "sound";
  if (/^\s*(animation|effect|motion|κίνηση|κινηση)/.test(rest)) return "animation";
  return null;
}

function findSound(text: string): UISoundName | null {
  const t = norm(text);
  for (const s of UI_SOUNDS) {
    if (s.id === "none") continue;
    const word = hasPhrase(t, s.id) ? s.id : hasPhrase(t, s.label.toLowerCase()) ? s.label.toLowerCase() : null;
    if (!word) continue;
    // If the word is explicitly an animation, it is not a sound
    if (qualifierAfter(t, word) === "animation") continue;
    return s.id;
  }
  if (/\b(silent|no sound|mute|without sound)\b/.test(t) || hasPhrase(t, "χωρίς ήχο")) return "none";
  return null;
}

function findAnimation(text: string): ElementAnimation | null {
  const t = norm(text);
  for (const a of ELEMENT_ANIMATIONS) {
    if (a.id === "none") continue;
    const word = hasPhrase(t, a.id) ? a.id : hasPhrase(t, a.label.toLowerCase()) ? a.label.toLowerCase() : null;
    if (!word) continue;
    if (qualifierAfter(t, word) === "sound") continue;
    return a.id;
  }
  if (/\b(no animation|still|don't move|dont move)\b/.test(t)) return "none";
  return null;
}

function findIcon(text: string, consumed: string[] = []): IconName | null {
  let t = norm(text);
  // Words already used to name the element cannot also name its icon,
  // so "the settings icon" does not become the Settings glyph.
  for (const phrase of consumed) {
    const i = phraseIndex(t, phrase);
    if (i >= 0) t = `${t.slice(0, i)} ${t.slice(i + phrase.length)}`.replace(/\s+/g, " ").trim();
  }
  // Formal icon names only count when an icon is clearly being discussed,
  // otherwise "the send button" would swap in the Send icon by itself.
  const iconIntent = /\b(icon|symbol|glyph|picture|image of|put a|put an|use a|use an|change the icon)\b/.test(t)
    || hasPhrase(t, "εικονίδιο");
  // These read as pictures whatever the sentence, so they count first
  const aliases: Record<string, IconName> = {
    rocket: "Rocket", fire: "Flame", flame: "Flame", heart: "Heart", star: "Star",
    crown: "Crown", ghost: "Moon", robot: "Bot", brain: "Brain", magic: "Wand2",
    lightning: "Zap", bolt: "Zap", house: "Home", gear: "Cog", cog: "Cog",
    bell: "Bell", camera: "Camera", music: "Music", game: "Gamepad2", coffee: "Coffee",
    pizza: "Pizza", gift: "Gift", shield: "Shield", moon: "Moon", sun: "Sun", cloud: "Cloud",
    smile: "Smile", plane: "Send", arrow: "ArrowUp", plus: "Plus", check: "Check",
  };
  for (const [k, v] of Object.entries(aliases)) if (hasPhrase(t, k)) return v;
  if (iconIntent) {
    for (const name of ICON_CHOICES) {
      const spaced = name.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();
      if (hasPhrase(t, spaced) || hasPhrase(t, name.toLowerCase())) return name;
    }
  }
  return null;
}

function findElements(text: string): { ids: string[]; phrases: string[] } {
  const t = norm(text);
  if (ALL.some((w) => hasPhrase(t, w))) return { ids: ELEMENTS.map((e) => e.id), phrases: [] };

  const hits = new Set<string>();
  const used: string[] = [];
  // Longest phrases first so "send button" beats "button"
  const pairs: [string, string][] = [];
  for (const [id, words] of Object.entries(ELEMENT_WORDS)) for (const w of words) pairs.push([w, id]);
  pairs.sort((a, b) => b[0].length - a[0].length);
  for (const [word, id] of pairs) {
    if (hasPhrase(t, word)) {
      hits.add(id);
      used.push(word);
    }
  }
  if (hits.size) return { ids: [...hits], phrases: used };

  // Fall back to whole groups
  for (const [group, words] of Object.entries(GROUP_WORDS)) {
    const match = words.find((w) => hasPhrase(t, w));
    if (match) {
      return { ids: ELEMENTS.filter((e) => e.group === group).map((e) => e.id), phrases: [match] };
    }
  }
  return { ids: [], phrases: [] };
}

// ---- the assistant --------------------------------------------------------
export function applyInstruction(
  instruction: string,
  current: { customization: ThemeCustomization; definition: ThemeDefinition; effects: ThemeEffects }
): AssistantResult {
  const text = instruction.trim();
  if (!text) return { summary: [], understood: false };
  const t = norm(text);

  const summary: string[] = [];
  const customization: ThemeCustomization = { ...current.customization };
  let effects: ThemeEffects | undefined;
  let definition: ThemeDefinition | undefined;

  // "reset" / "start over"
  if (/\b(reset|start over|clear everything|undo everything)\b/.test(t) || hasPhrase(t, "καθάρισε")) {
    return {
      summary: ["Cleared every element change."],
      customization: {},
      understood: true,
    };
  }

  const { ids: targets, phrases: usedPhrases } = findElements(text);
  const color = findColor(text);
  const sound = findSound(text);
  const animation = findAnimation(text);
  const icon = findIcon(text, usedPhrases);

  // Whole-theme settings that aren't tied to one element
  const bg = BACKGROUNDS.find((b) => b.id !== "none" && hasPhrase(t, b.id));
  const ambient = SOUNDS.find((s) => s.id !== "none" && hasPhrase(t, s.id));
  const motion = MOTION_STYLES.find((m) => m.id !== "smooth" && hasPhrase(t, m.id));
  const wantsBackground = /\b(background|behind|backdrop)\b/.test(t) || hasPhrase(t, "φόντο");
  const wantsAmbience = /\b(ambience|ambient|background sound|atmosphere|soundscape)\b/.test(t);

  if (wantsBackground && bg) {
    effects = { ...current.effects, background: bg.id as BackgroundKind };
    summary.push(`Background animation set to ${bg.label}.`);
  }
  if (wantsAmbience && ambient) {
    effects = { ...(effects ?? current.effects), sound: ambient.id as AmbientSound };
    summary.push(`Background sound set to ${ambient.label}.`);
  }
  if (motion && !targets.length) {
    effects = { ...(effects ?? current.effects), motion: motion.id as MotionStyle };
    summary.push(`The app now moves ${motion.label.toLowerCase()}.`);
  }

  if (targets.length) {
    // Does the phrasing point at the fill or the icon/text colour?
    const wantsBg = /\b(background|fill|filled|behind|bg)\b/.test(t);
    const changes: string[] = [];

    for (const id of targets) {
      const spec = ELEMENTS.find((e) => e.id === id);
      if (!spec) continue;
      const next: ElementStyle = { ...(customization[id] ?? {}) };
      let touched = false;

      if (color) {
        if (wantsBg && spec.traits.includes("background")) { next.background = color; touched = true; }
        else if (spec.traits.includes("color")) { next.color = color; touched = true; }
        else if (spec.traits.includes("background")) { next.background = color; touched = true; }
      }
      if (icon && spec.traits.includes("icon")) { next.icon = icon; touched = true; }
      if (sound !== null && spec.traits.includes("sound")) { next.sound = sound; touched = true; }
      if (animation !== null && spec.traits.includes("animation")) { next.animation = animation; touched = true; }

      if (touched) {
        customization[id] = next;
        changes.push(spec.label);
      }
    }

    if (changes.length) {
      const what: string[] = [];
      if (color) what.push(`colour ${color}`);
      if (icon) what.push(`the ${icon} icon`);
      if (sound) what.push(sound === "none" ? "no sound" : `a ${sound} sound`);
      if (animation) what.push(animation === "none" ? "no animation" : `a ${animation} animation`);
      const list = changes.length > 4 ? `${changes.length} elements` : changes.join(", ");
      summary.push(`${list}: ${what.join(", ") || "updated"}.`);
    } else if (!summary.length) {
      const names = targets.slice(0, 3).map((id) => ELEMENTS.find((e) => e.id === id)?.label).filter(Boolean);
      return {
        summary: [
          `I found ${names.join(", ")}, but not what to change. Try naming a colour, an icon, a sound or an animation — for example "make it blue with a pop sound".`,
        ],
        understood: false,
      };
    }
  } else if (!summary.length) {
    // Nothing recognised: say what would work instead of guessing
    return {
      summary: [
        "I didn't catch which part to change. Name one, like \"the send button\", \"my bubbles\", \"the AI tab\" or \"all tabs\", then what to do: a colour, an icon, a sound or an animation.",
      ],
      understood: false,
    };
  }

  return {
    summary,
    customization: targets.length ? customization : undefined,
    effects,
    definition,
    understood: true,
  };
}

export const ASSISTANT_EXAMPLES = [
  "make the send button red with a pop sound",
  "give every tab a bounce animation",
  "put a rocket on the AI tab",
  "my bubbles green with a bubble sound",
  "all buttons glow",
  "chats tab gold with a chime",
  "aurora background",
  "κάνε το κουμπί αποστολής μπλε",
];
