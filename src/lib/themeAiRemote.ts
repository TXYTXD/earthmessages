// Talks to the theme-ai edge function, where a real model does the
// understanding. When no key is configured (or the call fails) the caller
// falls back to the on-device assistant, so the feature never just breaks.

import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { normalizeCustomization, type ThemeCustomization } from "@/lib/themeCustomization";
import { normalizeEffects, type ThemeEffects } from "@/lib/themeEffects";
import { completeDefinition, isValidDefinition, type ThemeDefinition } from "@/lib/customThemes";

export interface RemoteThemeEdit {
  /** false when the owner has not configured a model key */
  configured: boolean;
  provider?: string;
  reply?: string;
  customization?: ThemeCustomization;
  definition?: ThemeDefinition;
  effects?: ThemeEffects;
  changed: number;
}

interface CurrentState {
  customization: ThemeCustomization;
  definition: ThemeDefinition;
  effects: ThemeEffects;
}

// Remember whether a model is available so the app stops asking after the
// first "not configured" answer in a session.
let knownConfigured: boolean | null = null;
export const modelAvailable = () => knownConfigured;

export async function askThemeAI(instruction: string, state: CurrentState): Promise<RemoteThemeEdit | null> {
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
        instruction,
        state: {
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
    if (!resp.ok) return null;
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

    let definition: ThemeDefinition | undefined;
    if (data.palette && typeof data.palette === "object") {
      const p = data.palette as Partial<ThemeDefinition>;
      const merged: ThemeDefinition = {
        ...state.definition,
        ...(p.primary ? { primary: p.primary } : {}),
        ...(p.gradient ? { gradient: p.gradient } : {}),
        ...(p.tint ? { tint: p.tint } : {}),
        ...(p.bubble ? { bubble: p.bubble } : {}),
        ...(p.received ? { received: p.received } : {}),
        ...(p.sidebar ? { sidebar: p.sidebar } : {}),
        ...(p.surface ? { surface: p.surface } : {}),
      };
      if (isValidDefinition(merged)) definition = merged;
    }

    const effects = data.effects
      ? normalizeEffects({ ...state.effects, ...(data.effects as object) })
      : undefined;

    return {
      configured: true,
      provider: typeof data.provider === "string" ? data.provider : undefined,
      reply: typeof data.reply === "string" ? data.reply : undefined,
      customization,
      definition,
      effects,
      changed: typeof data.changed === "number" ? data.changed : 0,
    };
  } catch (e) {
    console.warn("[ThemeAI] remote call failed:", e);
    return null;
  }
}
