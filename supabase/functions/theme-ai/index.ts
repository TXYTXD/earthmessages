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
  "button.send": ["color", "background", "icon", "animation", "sound"],
  "button.primary": ["color", "background", "animation", "sound"],
  "button.emoji": ["color", "icon", "sound"],
  "button.attach": ["color", "icon", "sound"],
  "button.mic": ["color", "icon", "sound"],
  "button.gif": ["color", "icon", "sound"],
  "input.box": ["background", "color"],
  "list.row": ["background", "animation", "sound"],
  "list.unread": ["color", "background", "animation"],
  "list.online": ["color", "animation"],
  "avatar.ring": ["background", "animation"],
  "call.answer": ["color", "background", "icon", "animation", "sound"],
  "call.decline": ["color", "background", "icon", "animation", "sound"],
  "call.control": ["color", "background", "sound"],
  "surface.card": ["background"],
  "surface.dialog": ["background", "animation", "sound"],
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

// ---- Sounds and animations the model composes ------------------------------
// Described as numbers only, and every number is clamped here, so a theme
// can never carry anything but a tone at a frequency or a keyframe at a scale.
const WAVES = ["sine", "square", "sawtooth", "triangle"];
const FILTERS = ["lowpass", "highpass", "bandpass"];

const clampNum = (v: unknown, min: number, max: number): number | undefined => {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.min(max, Math.max(min, v));
};

function cleanGeneratedSound(raw: unknown): unknown {
  const s = raw as { name?: unknown; layers?: unknown };
  if (!s || typeof s !== "object" || !Array.isArray(s.layers)) return undefined;
  const layers: Record<string, unknown>[] = [];
  for (const entry of s.layers.slice(0, 4)) {
    const l = entry as Record<string, unknown>;
    if (!l || typeof l !== "object") continue;
    const from = clampNum(l.from, 20, 12000);
    const duration = clampNum(l.duration, 0.01, 1.5);
    const gain = clampNum(l.gain, 0, 1) ?? 0.3;
    if (from === undefined || duration === undefined) continue;
    const layer: Record<string, unknown> = {
      type: l.type === "noise" ? "noise" : "tone",
      from, duration, gain,
    };
    if (typeof l.wave === "string" && WAVES.includes(l.wave)) layer.wave = l.wave;
    const to = clampNum(l.to, 20, 12000);
    if (to !== undefined) layer.to = to;
    const delay = clampNum(l.delay, 0, 1);
    if (delay) layer.delay = delay;
    if (typeof l.filter === "string" && FILTERS.includes(l.filter)) layer.filter = l.filter;
    const q = clampNum(l.q, 0.1, 20);
    if (q !== undefined) layer.q = q;
    layers.push(layer);
  }
  if (!layers.length) return undefined;
  return { name: typeof s.name === "string" ? s.name.slice(0, 40) : "Custom sound", layers };
}

function cleanGeneratedAnimation(raw: unknown): unknown {
  const a = raw as { name?: unknown; duration?: unknown; repeat?: unknown; keyframes?: unknown };
  if (!a || typeof a !== "object" || !Array.isArray(a.keyframes)) return undefined;
  const frames: Record<string, number>[] = [];
  for (const entry of a.keyframes.slice(0, 8)) {
    const k = entry as Record<string, unknown>;
    if (!k || typeof k !== "object") continue;
    const at = clampNum(k.at, 0, 100);
    if (at === undefined) continue;
    const frame: Record<string, number> = { at };
    const fields: [string, number, number][] = [
      ["scale", 0.2, 3], ["rotate", -720, 720], ["x", -100, 100],
      ["y", -100, 100], ["opacity", 0, 1], ["brightness", 0.2, 3],
    ];
    for (const [name, min, max] of fields) {
      const n = clampNum(k[name], min, max);
      if (n !== undefined) frame[name] = n;
    }
    frames.push(frame);
  }
  if (frames.length < 2) return undefined;
  frames.sort((p, q) => p.at - q.at);
  return {
    name: typeof a.name === "string" ? a.name.slice(0, 40) : "Custom animation",
    duration: clampNum(a.duration, 80, 6000) ?? 400,
    keyframes: frames,
    ...(a.repeat === true ? { repeat: true } : {}),
  };
}

// Find a real recording on Wikimedia Commons. The model only ever supplies
// search words; the URL comes from Wikimedia, never from the model.
async function findLibrarySound(query: string): Promise<string | undefined> {
  try {
    const params = new URLSearchParams({
      action: "query", generator: "search",
      gsrsearch: `filetype:audio ${query}`.slice(0, 200),
      gsrnamespace: "6", gsrlimit: "10",
      prop: "imageinfo", iiprop: "url|size|mime|metadata", format: "json", origin: "*",
    });
    const resp = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!resp.ok) return undefined;
    const data = await resp.json();
    const pages = Object.values((data?.query?.pages ?? {}) as Record<string, {
      imageinfo?: { url: string; size: number; mime: string; metadata?: { name: string; value: unknown }[] }[];
    }>);
    for (const page of pages) {
      const ii = page.imageinfo?.[0];
      if (!ii || !AUDIO_HOST.test(ii.url)) continue;
      if (!/^audio\/(ogg|mpeg|mp3|wav|x-wav|flac|webm)$/i.test(ii.mime)) continue;
      if (ii.size > 800_000) continue;
      const len = ii.metadata?.find((m) => m.name === "playtime_seconds" || m.name === "length");
      if (Number(len?.value ?? 0) > 6) continue;
      return `url:${ii.url}`;
    }
  } catch (e) {
    console.warn("sound search failed:", e);
  }
  return undefined;
}

// ---- Turn whatever the model said into something safe ---------------------
interface Patch {
  customization?: Record<string, Record<string, unknown>>;
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
    const custom: Record<string, Record<string, unknown>> = {};
    for (const [id, value] of Object.entries(elementMap)) {
      const traits = ELEMENTS[id];
      if (!traits || !value || typeof value !== "object") continue;
      const style: Record<string, unknown> = {};
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
      if (traits.includes("sound")) {
        const made = cleanGeneratedSound(v.generatedSound);
        if (made) style.generatedSound = made;
        // Search words are resolved to a real file after this pass
        if (typeof v.soundSearch === "string" && v.soundSearch.trim()) {
          style.soundSearch = v.soundSearch.trim().slice(0, 60);
        }
      }
      if (traits.includes("animation")) {
        const made = cleanGeneratedAnimation(v.generatedAnimation);
        if (made) style.generatedAnimation = made;
      }
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
          soundSearch: {
            type: "string",
            description: "Words to find a real recording on Wikimedia Commons, e.g. \"church bell\" or \"water drop\". Use when a real sound suits better than a synthesised one.",
          },
          generatedSound: {
            type: "object",
            description: "A sound you compose yourself, when nothing in the list fits.",
            properties: {
              name: { type: "string" },
              layers: {
                type: "array",
                maxItems: 4,
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["tone", "noise"] },
                    wave: { type: "string", enum: ["sine", "square", "sawtooth", "triangle"] },
                    from: { type: "number", description: "Starting frequency in Hz, 20-12000" },
                    to: { type: "number", description: "Optional glide to this frequency" },
                    duration: { type: "number", description: "Seconds, up to 1.5" },
                    gain: { type: "number", description: "Loudness 0-1" },
                    delay: { type: "number", description: "Seconds before this layer starts" },
                    filter: { type: "string", enum: ["lowpass", "highpass", "bandpass"] },
                    q: { type: "number" },
                  },
                  required: ["type", "from", "duration", "gain"],
                  additionalProperties: false,
                },
              },
            },
            required: ["layers"],
            additionalProperties: false,
          },
          generatedAnimation: {
            type: "object",
            description: "An animation you compose yourself, when nothing in the list fits.",
            properties: {
              name: { type: "string" },
              duration: { type: "number", description: "Milliseconds, 80-6000" },
              repeat: { type: "boolean", description: "true to run continuously" },
              keyframes: {
                type: "array",
                minItems: 2,
                maxItems: 8,
                items: {
                  type: "object",
                  properties: {
                    at: { type: "number", description: "Position through the animation, 0-100" },
                    scale: { type: "number", description: "0.2-3" },
                    rotate: { type: "number", description: "Degrees" },
                    x: { type: "number", description: "Sideways, % of own size" },
                    y: { type: "number", description: "Up/down, % of own size" },
                    opacity: { type: "number", description: "0-1" },
                    brightness: { type: "number", description: "0.2-3" },
                  },
                  required: ["at"],
                  additionalProperties: false,
                },
              },
            },
            required: ["duration", "keyframes"],
            additionalProperties: false,
          },
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
    "",
    "Sounds and animations — you are not limited to the lists:",
    "- generatedSound lets you compose a sound from layers of tones and noise. A tone is pitched (a chime, a blip); noise is unpitched (a click, a whoosh, rain). Layer two or three for something richer, using delay to stagger them.",
    "- soundSearch finds a real recording on Wikimedia Commons. Prefer it when the person asks for something recognisable that synthesis cannot do well — a cat, a church bell, a camera shutter. Keep the words short.",
    "- generatedAnimation lets you compose motion from keyframes. Set repeat only for a gentle idle motion; leave it off for a reaction to a tap.",
    "- Compose something when the built-in lists do not fit what was asked for. Use a built-in name when one genuinely matches — it is lighter.",
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
function elementsToMap(raw: unknown): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  if (!Array.isArray(raw)) return out;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { id, ...rest } = entry as Record<string, unknown>;
    if (typeof id !== "string") continue;
    const style: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v === "string" && v) style[k] = v;
      else if ((k === "generatedSound" || k === "generatedAnimation") && v && typeof v === "object") {
        style[k] = v;
      }
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

    // Turn any search words the model gave into real Wikimedia files. Doing
    // it here means the model never supplies a URL itself.
    if (patch.customization) {
      const wanted = Object.entries(patch.customization).filter(
        ([, style]) => typeof (style as Record<string, unknown>).soundSearch === "string"
      );
      // A handful at most, so one instruction cannot fan out into many lookups
      const found = await Promise.all(
        wanted.slice(0, 6).map(async ([id, style]) => {
          const query = (style as Record<string, unknown>).soundSearch as string;
          return [id, await findLibrarySound(query)] as const;
        })
      );
      for (const [id, style] of wanted) {
        const entry = style as Record<string, unknown>;
        const hit = found.find(([foundId]) => foundId === id)?.[1];
        delete entry.soundSearch;
        // Only set it if nothing better was already chosen for this element
        if (hit && !entry.generatedSound && !entry.sound) entry.sound = hit;
      }
      // An element left with nothing at all is dropped
      for (const [id, style] of Object.entries(patch.customization)) {
        if (!Object.keys(style as Record<string, unknown>).length) delete patch.customization[id];
      }
    }

    return json({ configured: true, provider, changed, ...patch });
  } catch (e) {
    console.error("theme-ai error:", e);
    return json({ error: "The theme assistant could not answer just now.", detail: String(e).slice(0, 200) }, 502);
  }
});
