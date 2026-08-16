import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const targetName = LANG_NAMES[targetLang] || targetLang;
    const sourceHint = sourceLang ? `from ${LANG_NAMES[sourceLang] || sourceLang} ` : "";

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    let response;
    try {
      response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: `You are a translator. Translate the user's message ${sourceHint}to ${targetName}. Return ONLY the translated text, nothing else. If the text is already in ${targetName}, return it unchanged. Preserve formatting, emojis, and special characters.`,
        messages: [{ role: "user", content: text }],
      });
    } catch (err) {
      const status = (err as { status?: number })?.status ?? 500;
      console.error("Anthropic API error:", status, err);
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI translation failed");
    }

    const textBlock = response.content.find((b) => b.type === "text");
    const translatedText = (textBlock && "text" in textBlock ? textBlock.text : "").trim() || text;

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
