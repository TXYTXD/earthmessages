import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

// Secrets are pasted by hand, so they often arrive with a trailing newline
// or a stray space. Trim everything we read; an empty value counts as unset.
function env(name: string): string | undefined {
  const v = Deno.env.get(name)?.trim();
  return v ? v : undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  en: "English", zh: "Chinese", es: "Spanish", fr: "French",
  de: "German", ja: "Japanese", ko: "Korean", pt: "Portuguese",
  ar: "Arabic", hi: "Hindi", it: "Italian", ru: "Russian",
  el: "Greek", nl: "Dutch", sv: "Swedish", pl: "Polish",
  tr: "Turkish", th: "Thai", vi: "Vietnamese", id: "Indonesian",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, targetLang, sourceLang } = await req.json();

    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: "text and targetLang are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeKey = env("ANTHROPIC_API_KEY");
    const geminiKey = env("GEMINI_API_KEY");
    const openBase = env("OPEN_AI_BASE_URL");
    const openModel = env("OPEN_AI_MODEL");
    const hasOpen = !!openBase && !!openModel;
    const preferred = (env("AI_PROVIDER") ?? "").toLowerCase();

    const provider: "claude" | "gemini" | "open" | null =
      preferred === "open" && hasOpen ? "open"
      : preferred === "gemini" && geminiKey ? "gemini"
      : preferred === "claude" && claudeKey ? "claude"
      : claudeKey ? "claude"
      : geminiKey ? "gemini"
      : hasOpen ? "open"
      : null;
    if (!provider) throw new Error("No AI provider is configured");

    const targetName = LANG_NAMES[targetLang] || targetLang;
    const sourceHint = sourceLang ? `from ${LANG_NAMES[sourceLang] || sourceLang} ` : "";

    const system = `You are a translator. Translate the user's message ${sourceHint}to ${targetName}. Return ONLY the translated text, nothing else. If the text is already in ${targetName}, return it unchanged. Preserve formatting, emojis, and special characters.`;

    let translated = "";
    try {
      if (provider === "open") {
        if (!/^https?:\/\//i.test(openBase!)) {
          throw new Error(`OPEN_AI_BASE_URL must start with https:// — it holds "${openBase}"`);
        }
        const resp = await fetch(`${openBase!.replace(/\/+$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(env("OPEN_AI_API_KEY") ? { Authorization: `Bearer ${env("OPEN_AI_API_KEY")}` } : {}),
          },
          body: JSON.stringify({
            model: openModel,
            max_tokens: 1024,
            temperature: 0.2,
            messages: [
              { role: "system", content: system },
              { role: "user", content: text },
            ],
          }),
        });
        if (!resp.ok) {
          const err = new Error(`AI service ${resp.status}`) as Error & { status?: number };
          err.status = resp.status;
          throw err;
        }
        const data = await resp.json();
        translated = data?.choices?.[0]?.message?.content ?? "";
      } else if (provider === "gemini") {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey!)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text }] }],
              generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
            }),
          }
        );
        if (!resp.ok) {
          const err = new Error(`Gemini ${resp.status}`) as Error & { status?: number };
          err.status = resp.status;
          throw err;
        }
        const data = await resp.json();
        translated = (data?.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p.text ?? "")
          .join("");
      } else {
        const anthropic = new Anthropic({ apiKey: claudeKey! });
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          system,
          messages: [{ role: "user", content: text }],
        });
        const textBlock = response.content.find((b) => b.type === "text");
        translated = textBlock && "text" in textBlock ? textBlock.text : "";
      }
    } catch (err) {
      const status = (err as { status?: number })?.status ?? 500;
      console.error("Translation API error:", status, err);
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI translation failed");
    }

    const translatedText = translated.trim() || text;

    // If translation is same as original, skip
    if (translatedText.toLowerCase() === text.toLowerCase()) {
      return new Response(
        JSON.stringify({ translatedText: null, same: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ translatedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
