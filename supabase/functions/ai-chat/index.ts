import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Which model answers. Claude needs paid credit; Gemini has a free tier.
// AI_PROVIDER ("claude" or "gemini") picks when both keys are set; otherwise
// whichever key exists is used.
function pickProvider(): "claude" | "gemini" | null {
  const claude = Deno.env.get("ANTHROPIC_API_KEY");
  const gemini = Deno.env.get("GEMINI_API_KEY");
  const preferred = (Deno.env.get("AI_PROVIDER") ?? "").toLowerCase();
  if (preferred === "gemini" && gemini) return "gemini";
  if (preferred === "claude" && claude) return "claude";
  if (claude) return "claude";
  if (gemini) return "gemini";
  return null;
}

// Gemini's streaming endpoint, re-shaped into the same events the app reads.
async function geminiStream(
  key: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<AsyncIterable<string>> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 2048, temperature: 0.8 },
      }),
    }
  );
  if (!resp.ok || !resp.body) {
    const detail = resp.body ? (await resp.text()).slice(0, 200) : "";
    const err = new Error(`Gemini ${resp.status}: ${detail}`) as Error & { status?: number };
    err.status = resp.status;
    throw err;
  }

  const body = resp.body;
  return (async function* () {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE frames are separated by a blank line
      let cut = buffer.indexOf("\n\n");
      while (cut !== -1) {
        const frame = buffer.slice(0, cut);
        buffer = buffer.slice(cut + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const data = JSON.parse(payload);
            const text = (data?.candidates?.[0]?.content?.parts ?? [])
              .map((part: { text?: string }) => part.text ?? "")
              .join("");
            if (text) yield text;
          } catch {
            /* a partial frame — ignore it */
          }
        }
        cut = buffer.indexOf("\n\n");
      }
    }
  })();
}

const SYSTEM_PROMPT =
  "You are Claude, made by Anthropic, acting as the friendly AI assistant inside a messaging app called UMS Messages. " +
  "Keep your answers concise, helpful, and conversational. Feel free to use emojis whenever you want to match the chat vibe. " +
  "You can also send a GIF whenever you want by writing a tag in the form [gif: search terms] (for example [gif: happy dance] or [gif: mind blown]) — " +
  "it will be replaced with a real animated GIF in the chat. Put the tag on its own and keep the search terms short and descriptive.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { messages } = await req.json();
    const provider = pickProvider();
    if (!provider) {
      console.error("No AI key configured (ANTHROPIC_API_KEY or GEMINI_API_KEY)");
      return new Response(JSON.stringify({ error: "AI is not configured yet" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean the chat history for the Anthropic API: only user/assistant turns
    // with non-empty text, merge consecutive same-role turns, start with user.
    type Turn = { role: "user" | "assistant"; content: string };
    const history: Turn[] = (Array.isArray(messages) ? messages : [])
      .filter((m) =>
        m && (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" && m.content.trim().length > 0
      )
      .map((m) => ({ role: m.role as Turn["role"], content: m.content }));
    const merged: Turn[] = [];
    for (const m of history) {
      const last = merged[merged.length - 1];
      if (last && last.role === m.role) last.content += "\n\n" + m.content;
      else merged.push({ ...m });
    }
    while (merged.length > 0 && merged[0].role !== "user") merged.shift();
    if (merged.length === 0) {
      return new Response(JSON.stringify({ error: "No message to send" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Both providers end up as an async stream of plain text pieces
    let textStream: AsyncIterable<string>;
    try {
      if (provider === "gemini") {
        textStream = await geminiStream(Deno.env.get("GEMINI_API_KEY")!, SYSTEM_PROMPT, merged);
      } else {
        const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
        const stream = await anthropic.messages.create({
          model: "claude-opus-5",
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: merged,
          stream: true,
        });
        textStream = (async function* () {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta" &&
              event.delta.text
            ) {
              yield event.delta.text;
            }
          }
        })();
      }
    } catch (err) {
      const status = (err as { status?: number })?.status ?? 500;
      console.error(`${provider} API error:`, status, err);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 401) {
        return new Response(JSON.stringify({ error: "AI is not configured correctly" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 400) {
        return new Response(JSON.stringify({ error: provider === "gemini" ? "The free AI limit was reached. Try again shortly." : "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-emit in the SSE shape the app already understands:
    // data: {"choices":[{"delta":{"content":"..."}}]} lines ending with [DONE].
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        try {
          for await (const piece of textStream) {
            const line = `data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`;
            controller.enqueue(encoder.encode(line));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
        controller.close();
      },
    });

    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
