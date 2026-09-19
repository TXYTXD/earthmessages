import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The smart half of UMS Theme AI. It takes an instruction about a theme and
// returns a patch describing what to change. A real model does the
// understanding; this function decides what is allowed to be changed.
//
// Whichever key the owner has configured is used:
//   GEMINI_API_KEY     -> Google Gemini
//   ANTHROPIC_API_KEY  -> Claude (the same key the AI tab uses)
// With neither, the app falls back to its built-in on-device assistant.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---- What a theme is allowed to contain -----------------------------------
// Kept in step with src/lib/themeElements.ts. The model may only name things
// from these lists; anything else is dropped before it reaches a browser.
const ELEMENTS: Record<string, string[]> = {
  "nav.bar": ["background"],
  "nav.active": ["color", "background", "animation", "sound"],
  "nav.idle": ["color", "sound"],
  "nav.chats": ["color", "icon", "sound", "animation"],
  "nav.stories": ["color", "icon", "sound", "animation"],
  "nav.communities": ["color", "icon", "sound", "animation"],
  "nav.calls": ["color", "icon", "sound", "animation"],
  "nav.ai": ["color", "icon", "sound", "animation"],
  "nav.calendar": ["color", "icon", "sound", "animation"],
  "nav.settings": ["color", "icon", "sound", "animation"],
  "nav.account": ["color", "icon", "sound", "animation"],
  "nav.logo": ["icon", "animation"],
  "bubble.sent": ["color", "background", "animation", "sound"],
  "bubble.received": ["color", "background", "animation", "sound"],
  "message.reaction": ["background", "animation", "sound"],
  "message.typing": ["color", "animation"],
  "message.time": ["color"],
  "button.send": ["color", "background", "icon", "animation", "sound"],
  "button.primary": ["color", "background", "animation", "sound"],
  "button.emoji": ["color", "icon", "sound"],
  "button.attach": ["color", "icon", "sound"],
  "button.mic": ["color", "icon", "sound"],
  "button.gif": ["color", "icon", "sound"],
  "input.box": ["background", "color"],
  "list.row": ["background", "animation", "sound"],
  "list.active": ["background", "color"],
  "list.unread": ["color", "background", "animation"],
  "list.online": ["color", "animation"],
  "avatar.ring": ["background", "animation"],
  "call.answer": ["color", "background", "icon", "animation", "sound"],
  "call.decline": ["color", "background", "icon", "animation", "sound"],
  "call.control": ["color", "background", "sound"],
  "surface.card": ["background"],
  "surface.header": ["background", "color"],
  "surface.dialog": ["background", "animation", "sound"],
  "surface.toast": ["background", "color", "animation", "sound"],
};

const ICONS = [
  "MessageCircle", "MessageSquare", "Mail", "Send", "Inbox", "AtSign",
  "CircleDot", "Camera", "Image", "Film", "Aperture", "Sparkles",
  "Globe2", "Users", "UsersRound", "Compass", "Map", "Network",
  "Phone", "PhoneCall", "Video", "Mic", "Headphones", "Radio",
  "Bot", "Cpu", "Brain", "Wand2", "Zap", "Star",
  "CalendarDays", "Calendar", "Clock", "Timer", "Bell", "Flag",
  "Settings", "Sliders", "Wrench", "Cog", "SlidersHorizontal", "Filter",
  "User", "UserRound", "Smile", "Heart", "Crown", "Shield",
  "Home", "Rocket", "Flame", "Moon", "Sun", "Cloud",
  "Music", "Gamepad2", "Coffee", "Pizza", "Leaf", "Gift",
  "Paperclip", "Plus", "Check", "ArrowUp", "ArrowRight", "Play",
];
const SOUNDS = ["none", "tap", "pop", "click", "chime", "ding", "blip", "whoosh", "swipe",
  "bubble", "knock", "coin", "laser", "drop", "typewriter", "harp", "error"];
const ANIMATIONS = ["none", "pop", "bounce", "pulse", "shake", "glow", "spin", "float", "flip", "jelly"];
const BACKGROUNDS = ["none", "aurora", "stars", "bubbles", "waves", "orbs", "grid", "snow", "embers", "rain"];
const AMBIENCE = ["none", "rain", "waves", "forest", "fire", "space", "cafe", "wind"];
const MOTIONS = ["none", "calm", "smooth", "playful", "snappy"];

const HEX = /^#[0-9a-f]{6}$/i;
const inList = (v: unknown, list: string[]) => typeof v === "string" && list.includes(v);

// Sounds fetched from the internet may only come from Wikimedia's own file
// host, so a published theme can never point a listener's browser at an
// arbitrary server.
const AUDIO_HOST = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//;
const isLibrarySound = (v: unknown) =>
  typeof v === "string" && v.startsWith("url:") && AUDIO_HOST.test(v.slice(4)) && v.length <= 500;

// ---- Turn whatever the model said into something safe ---------------------
interface Patch {
  customization?: Record<string, Record<string, string>>;
  palette?: Record<string, unknown>;
  effects?: Record<string, unknown>;
  reply?: string;
}

function sanitize(raw: unknown): { patch: Patch; changed: number } {
  const p = (raw ?? {}) as Patch;
  const out: Patch = {};
  let changed = 0;

  // Per-element overrides
  if (p.customization && typeof p.customization === "object") {
    const custom: Record<string, Record<string, string>> = {};
    for (const [id, value] of Object.entries(p.customization)) {
      const traits = ELEMENTS[id];
      if (!traits || !value || typeof value !== "object") continue;
      const style: Record<string, string> = {};
      const v = value as Record<string, unknown>;
      if (traits.includes("color") && typeof v.color === "string" && HEX.test(v.color)) style.color = v.color;
      if (traits.includes("background") && typeof v.background === "string" && HEX.test(v.background)) {
        style.background = v.background;
      }
      if (traits.includes("icon") && inList(v.icon, ICONS)) style.icon = v.icon as string;
      if (traits.includes("sound") && (inList(v.sound, SOUNDS) || isLibrarySound(v.sound))) {
        style.sound = v.sound as string;
      }
      if (traits.includes("animation") && inList(v.animation, ANIMATIONS)) style.animation = v.animation as string;
      if (Object.keys(style).length) {
        custom[id] = style;
        changed++;
      }
      if (changed >= 80) break;
    }
    if (Object.keys(custom).length) out.customization = custom;
  }

  // The colour palette
  if (p.palette && typeof p.palette === "object") {
    const pal = p.palette as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const k of ["primary", "tint", "received", "sidebar", "surface"]) {
      if (typeof pal[k] === "string" && HEX.test(pal[k] as string)) clean[k] = pal[k];
    }
    if (Array.isArray(pal.gradient) && pal.gradient.length === 3 && pal.gradient.every((c) => typeof c === "string" && HEX.test(c))) {
      clean.gradient = pal.gradient;
    }
    if (Array.isArray(pal.bubble) && pal.bubble.length === 2 && pal.bubble.every((c) => typeof c === "string" && HEX.test(c))) {
      clean.bubble = pal.bubble;
    }
    if (Object.keys(clean).length) {
      out.palette = clean;
      changed += Object.keys(clean).length;
    }
  }

  // Motion, background animation and ambience
  if (p.effects && typeof p.effects === "object") {
    const e = p.effects as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    if (inList(e.motion, MOTIONS)) clean.motion = e.motion;
    if (inList(e.background, BACKGROUNDS)) clean.background = e.background;
    if (inList(e.sound, AMBIENCE)) clean.sound = e.sound;
    for (const k of ["backgroundIntensity", "soundVolume"]) {
      const n = e[k];
      if (typeof n === "number" && Number.isFinite(n)) clean[k] = Math.min(100, Math.max(0, Math.round(n)));
    }
    if (Object.keys(clean).length) {
      out.effects = clean;
      changed += Object.keys(clean).length;
    }
  }

  if (typeof p.reply === "string") out.reply = p.reply.slice(0, 600);
  return { patch: out, changed };
}

// ---- What the model is told -----------------------------------------------
function systemPrompt(): string {
  return [
    "You design themes for UMS Messages, a messaging app. The person tells you what they want changed and you answer with JSON only.",
    "",
    "Reply with exactly this shape and nothing else — no prose, no markdown fence:",
    '{"reply":"one short friendly sentence saying what you did","customization":{"<elementId>":{"color":"#rrggbb","background":"#rrggbb","icon":"<IconName>","sound":"<sound>","animation":"<animation>"}},"palette":{"primary":"#rrggbb","gradient":["#rrggbb","#rrggbb","#rrggbb"],"bubble":["#rrggbb","#rrggbb"],"received":"#rrggbb","sidebar":"#rrggbb","surface":"#rrggbb","tint":"#rrggbb"},"effects":{"motion":"<motion>","background":"<background>","backgroundIntensity":0,"sound":"<ambience>","soundVolume":0}}',
    "",
    "Include only the keys you are actually changing. Leave everything else out.",
    "",
    "Element ids and what each one accepts:",
    ...Object.entries(ELEMENTS).map(([id, traits]) => `  ${id}: ${traits.join(", ")}`),
    "",
    `Icons: ${ICONS.join(", ")}`,
    `Sounds: ${SOUNDS.join(", ")}`,
    `Animations: ${ANIMATIONS.join(", ")}`,
    `Background animations: ${BACKGROUNDS.join(", ")}`,
    `Ambient sounds: ${AMBIENCE.join(", ")}`,
    `Motion styles: ${MOTIONS.join(", ")}`,
    "",
    "Rules:",
    "- Colours are always #rrggbb.",
    "- Never invent an element id, icon, sound or animation that is not listed above.",
    "- palette.primary is the accent; palette.bubble is the two-colour fade on the messages the person sends.",
    "- Keep text readable: do not put a dark colour on a dark surface or a light one on a light surface.",
    "- When they describe a mood rather than a part ('make it feel like the sea'), set the palette and effects.",
    "- When they name a part ('the send button'), change just that part.",
    "- 'everything' means give most elements a coherent treatment, not one flat colour.",
    "- The person may write in any language; reply in the language they used.",
  ].join("\n");
}

function userPrompt(instruction: string, state: unknown): string {
  return [
    "Current theme:",
    JSON.stringify(state).slice(0, 4000),
    "",
    "What they asked for:",
    instruction.slice(0, 1000),
  ].join("\n");
}

// ---- Providers ------------------------------------------------------------
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("model did not return JSON");
  return JSON.parse(body.slice(start, end + 1));
}

async function askGemini(key: string, instruction: string, state: unknown): Promise<unknown> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents: [{ role: "user", parts: [{ text: userPrompt(instruction, state) }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: "application/json" },
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return extractJson(text);
}

async function askClaude(key: string, instruction: string, state: unknown): Promise<unknown> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      system: systemPrompt(),
      messages: [{ role: "user", content: userPrompt(instruction, state) }],
    }),
  });
  if (!resp.ok) throw new Error(`Claude ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const text = (data?.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
  return extractJson(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const instruction = String(body?.instruction ?? "").trim();
    if (!instruction) return json({ error: "Nothing to do" }, 400);
    const state = body?.state ?? {};

    const gemini = Deno.env.get("GEMINI_API_KEY");
    const claude = Deno.env.get("ANTHROPIC_API_KEY");
    if (!gemini && !claude) {
      // Not configured — the app uses its own on-device assistant instead
      return json({ configured: false });
    }

    let raw: unknown;
    let provider = "claude";
    try {
      if (gemini) {
        raw = await askGemini(gemini, instruction, state);
        provider = "gemini";
      } else {
        raw = await askClaude(claude!, instruction, state);
        provider = "claude";
      }
    } catch (e) {
      // One provider failing should not lose the feature if the other is set
      if (gemini && claude) {
        console.error("primary provider failed, trying the other:", e);
        raw = await askClaude(claude, instruction, state);
        provider = "claude";
      } else {
        throw e;
      }
    }

    const { patch, changed } = sanitize(raw);
    return json({ configured: true, provider, changed, ...patch });
  } catch (e) {
    console.error("theme-ai error:", e);
    return json({ error: "The theme assistant could not answer just now.", detail: String(e).slice(0, 200) }, 502);
  }
});
