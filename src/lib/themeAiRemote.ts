// Talks to the theme-ai edge function, where a real model does the
// understanding — the same model and key as the AI tab. When no key is
// configured (or the call fails) the caller falls back to the on-device
// assistant, so the feature never just breaks.

import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { normalizeCustomization, type ThemeCustomization } from "@/lib/themeCustomization";
import { normalizeEffects, type ThemeEffects } from "@/lib/themeEffects";
import { completeDefinition, isValidDefinition, type ThemeDefinition } from "@/lib/customThemes";

export interface ThemeChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface RemoteThemeEdit {
  /** false when the owner has not configured a model key */
  configured: boolean;
  /** Why the smart assistant could not answer, when it could not */
  failure?: string;
  /** A friendly name for whatever answered: Claude, Gemini, … */
  provider?: string;
  /** What the assistant said back */
  reply?: string;
  customization?: ThemeCustomization;
  definition?: ThemeDefinition;
  effects?: ThemeEffects;
  /** A name it suggests for the theme */
  name?: string;
  /** Other complete looks it offers alongside the main one */
  alternatives?: { name: string; definition: ThemeDefinition }[];
  changed: number;
}

export interface CurrentState {
  customization: ThemeCustomization;
  definition: ThemeDefinition;
  effects: ThemeEffects;
  name?: string;
}

// Remember whether a model is available so the app stops asking after the
// first "not configured" answer in a session.
let knownConfigured: boolean | null = null;
export const modelAvailable = () => knownConfigured;

function providerLabel(p: unknown): string | undefined {
  if (p === "claude") return "Claude";
  if (p === "gemini") return "Gemini";
  if (p === "open") return "AI";
  return typeof p === "string" && p ? p : undefined;
}

// A palette from the model laid over the current one — it only sends what
// it is changing — or undefined if the result would not be a valid theme.
function mergePalette(base: ThemeDefinition, raw: unknown): ThemeDefinition | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Partial<ThemeDefinition>;
  const merged: ThemeDefinition = {
    ...base,
    ...(p.primary ? { primary: p.primary } : {}),
    ...(p.gradient ? { gradient: p.gradient } : {}),
    ...(p.tint ? { tint: p.tint } : {}),
    ...(p.bubble ? { bubble: p.bubble } : {}),
    ...(p.received ? { received: p.received } : {}),
    ...(p.sidebar ? { sidebar: p.sidebar } : {}),
    ...(p.surface ? { surface: p.surface } : {}),
  };
  return isValidDefinition(merged) ? merged : undefined;
}

/**
 * One turn of the conversation. `messages` is everything said so far, the
 * person's newest message last; `state` is the theme as it is right now.
 */
export async function askThemeAI(messages: ThemeChatTurn[], state: CurrentState): Promise<RemoteThemeEdit | null> {
  if (knownConfigured === false) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const full = completeDefinition(state.definition);
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/theme-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        messages,
        state: {
          name: state.name || undefined,
          palette: {
            primary: state.definition.primary,
            gradient: state.definition.gradient,
            bubble: full.bubble,
            received: full.received,
            sidebar: full.sidebar,
            surface: full.surface,
            tint: state.definition.tint,
          },
          effects: state.effects,
          customization: state.customization,
        },
      }),
    });
    if (!resp.ok) {
      let why = `the AI service returned ${resp.status}`;
      try {
        const body = await resp.json();
        if (body?.detail || body?.error) why = String(body.detail || body.error);
      } catch {
        /* no JSON body */
      }
      return { configured: true, failure: why, changed: 0 };
    }
    const data = await resp.json();

    if (data?.configured === false) {
      knownConfigured = false;
      return { configured: false, changed: 0 };
    }
    knownConfigured = true;

    // Merge the patch onto what is already there — the model only sends
    // what it is changing.
    let customization: ThemeCustomization | undefined;
    if (data.customization) {
      customization = {
        ...state.customization,
        ...normalizeCustomization(data.customization),
      };
    }

    const definition = mergePalette(state.definition, data.palette);

    const effects = data.effects
      ? normalizeEffects({ ...state.effects, ...(data.effects as object) })
      : undefined;

    const alternatives: RemoteThemeEdit["alternatives"] = [];
    if (Array.isArray(data.alternatives)) {
      for (const alt of data.alternatives.slice(0, 2)) {
        const def = mergePalette(definition ?? state.definition, alt?.palette);
        if (def) alternatives.push({ name: typeof alt?.name === "string" ? alt.name : "Another idea", definition: def });
      }
    }

    return {
      configured: true,
      provider: providerLabel(data.provider),
      reply: typeof data.reply === "string" && data.reply.trim() ? data.reply.trim() : undefined,
      customization,
      definition,
      effects,
      name: typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 40) : undefined,
      alternatives: alternatives.length ? alternatives : undefined,
      changed: typeof data.changed === "number" ? data.changed : 0,
    };
  } catch (e) {
    console.warn("[ThemeAI] remote call failed:", e);
    return { configured: true, failure: String((e as Error)?.message || e), changed: 0 };
  }
}
