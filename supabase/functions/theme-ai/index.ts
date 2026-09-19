import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

// The smart half of UMS Theme AI. It takes an instruction about a theme and
// returns a patch describing what to change. A real model does the
// understanding; this function decides what is allowed to be changed.
//
// Claude is used when ANTHROPIC_API_KEY is set — the same key the AI tab and
// translation use, so one key covers every AI feature in the app. A
// GEMINI_API_KEY is honoured instead if that is all the owner has. With
// neither, the app falls back to its built-in on-device assistant.

// Secrets are pasted by hand, so they often arrive with a trailing newline
// or a stray space. Trim everything we read; an empty value counts as unset.
function env(name: string): string | undefined {
  const v = Deno.env.get(name)?.trim();
  return v ? v : undefined;
}

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
  const elementMap = p.customization ?? elementsToMap((raw as { elements?: unknown })?.elements);
  if (elementMap && typeof elementMap === "object") {
    const custom: Record<string, Record<string, string>> = {};
    for (const [id, value] of Object.entries(elementMap)) {
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
// The answer is constrained to this schema, so it always comes back as valid
// JSON with the right shape instead of prose we have to fish through.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "One short friendly sentence saying what you changed." },
    elements: {
      type: "array",
      description: "Per-element changes. Include only elements you are changing.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: Object.keys(ELEMENTS) },
          color: { type: "string", description: "#rrggbb, the text or icon colour" },
          background: { type: "string", description: "#rrggbb, the fill" },
          icon: { type: "string", enum: ICONS },
          sound: { type: "string", enum: SOUNDS },
          animation: { type: "string", enum: ANIMATIONS },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
    palette: {
      type: "object",
      description: "The theme's overall colours. Include only what you are changing.",
      properties: {
        primary: { type: "string", description: "#rrggbb accent" },
        gradient: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        bubble: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
        received: { type: "string" },
        sidebar: { type: "string" },
        surface: { type: "string" },
        tint: { type: "string" },
      },
      additionalProperties: false,
    },
    effects: {
      type: "object",
      description: "How the app moves and what plays behind it.",
      properties: {
        motion: { type: "string", enum: MOTIONS },
        background: { type: "string", enum: BACKGROUNDS },
        backgroundIntensity: { type: "integer", minimum: 0, maximum: 100 },
        sound: { type: "string", enum: AMBIENCE },
        soundVolume: { type: "integer", minimum: 0, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  required: ["reply"],
  additionalProperties: false,
} as const;

function systemPrompt(): string {
  return [
    "You design themes for UMS Messages, a messaging app. Someone tells you what they want changed and you return the change.",
    "",
    "What each element accepts — never set a property an element does not list:",
    ...Object.entries(ELEMENTS).map(([id, traits]) => `  ${id}: ${traits.join(", ")}`),
    "",
    "Guidance:",
    "- Colours are always #rrggbb.",
    "- palette.primary is the accent. palette.bubble is the two-colour fade on the messages this person sends.",
    "- Keep text readable: never put a dark colour on a dark surface or a light one on a light surface.",
    "- When they describe a mood rather than a part ('make it feel like the sea'), set the palette and the effects.",
    "- When they name a part ('the send button'), change just that part.",
    "- 'everything' means give the whole app a coherent treatment, not one flat colour on every element.",
    "- Reply in the language they wrote in.",
  ].join("\n");
}

function userPrompt(instruction: string, state: unknown): string {
  return [
    "The theme as it stands:",
    JSON.stringify(state).slice(0, 4000),
    "",
    "What they asked for:",
    instruction.slice(0, 1000),
  ].join("\n");
}

// The model answers with a list of element changes; the rest of this
// function works in the same map shape the app stores.
function elementsToMap(raw: unknown): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  if (!Array.isArray(raw)) return out;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { id, ...rest } = entry as Record<string, unknown>;
    if (typeof id !== "string") continue;
    const style: Record<string, string> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v === "string" && v) style[k] = v;
    }
    if (Object.keys(style).length) out[id] = { ...(out[id] ?? {}), ...style };
  }
  return out;
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

async function askClaude(key: string, instruction: string, state: unknown): Promise<unknown> {
  const anthropic = new Anthropic({ apiKey: key });
  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    // Theme edits are quick judgement calls, not deep reasoning; low effort
    // keeps the editor feeling instant.
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: RESPONSE_SCHEMA },
    },
    system: systemPrompt(),
    messages: [{ role: "user", content: userPrompt(instruction, state) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The assistant declined that request.");
  }
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return extractJson(text);
}

// Any chat-completions service — GLM, Groq, Mistral, DeepSeek, OpenRouter,
// or a model the owner hosts themselves.
async function askOpenCompat(instruction: string, state: unknown): Promise<unknown> {
  const rawBase = env("OPEN_AI_BASE_URL")!;
  if (!/^https?:\/\//i.test(rawBase)) {
    throw new Error(
      `OPEN_AI_BASE_URL must be a web address starting with https:// — it holds "${rawBase}". ` +
      `If that is the model name, it belongs in OPEN_AI_MODEL.`
    );
  }
  const base = rawBase.replace(/\/+$/, "");
  const key = env("OPEN_AI_API_KEY") ?? "";
  const model = env("OPEN_AI_MODEL")!;
  const resp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.7,
      // Most of these services support this; the ones that don't still
      // return JSON because the prompt asks for it, and extractJson copes.
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${systemPrompt()}\n\nAnswer with a JSON object matching this schema:\n${JSON.stringify(RESPONSE_SCHEMA)}` },
        { role: "user", content: userPrompt(instruction, state) },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`AI service ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  return extractJson(data?.choices?.[0]?.message?.content ?? "");
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
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
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

    const claude = env("ANTHROPIC_API_KEY");
    const gemini = env("GEMINI_API_KEY");
    const hasOpen = !!env("OPEN_AI_BASE_URL") && !!env("OPEN_AI_MODEL");
    const preferred = (env("AI_PROVIDER") ?? "").toLowerCase();

    const order: string[] = [];
    if (preferred === "open" && hasOpen) order.push("open");
    if (preferred === "gemini" && gemini) order.push("gemini");
    if (preferred === "claude" && claude) order.push("claude");
    if (claude) order.push("claude");
    if (gemini) order.push("gemini");
    if (hasOpen) order.push("open");
    const chain = [...new Set(order)];

    if (chain.length === 0) {
      // Not configured — the app uses its own on-device assistant instead
      return json({ configured: false });
    }

    // Try the preferred provider, then any other that is configured
    let raw: unknown;
    let provider = chain[0];
    let lastError: unknown;
    for (const candidate of chain) {
      try {
        if (candidate === "claude") raw = await askClaude(claude!, instruction, state);
        else if (candidate === "gemini") raw = await askGemini(gemini!, instruction, state);
        else raw = await askOpenCompat(instruction, state);
        provider = candidate;
        lastError = undefined;
        break;
      } catch (e) {
        console.error(`${candidate} failed:`, e);
        lastError = e;
      }
    }
    if (lastError) throw lastError;

    const { patch, changed } = sanitize(raw);
    return json({ configured: true, provider, changed, ...patch });
  } catch (e) {
    console.error("theme-ai error:", e);
    return json({ error: "The theme assistant could not answer just now.", detail: String(e).slice(0, 200) }, 502);
  }
});
