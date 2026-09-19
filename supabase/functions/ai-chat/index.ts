import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Secrets are pasted by hand, so they often arrive with a trailing newline
// or a stray space. Trim everything we read; an empty value counts as unset.
function env(name: string): string | undefined {
  const v = Deno.env.get(name)?.trim();
  return v ? v : undefined;
}

// Which model answers.
//   claude     — ANTHROPIC_API_KEY, paid credit
//   gemini     — GEMINI_API_KEY, has a free tier
//   open       — any service that speaks the widely used chat-completions
//                format: GLM (Z.ai), Groq, Mistral, DeepSeek, OpenRouter,
//                Cerebras, or a model you host yourself. Set
//                OPEN_AI_BASE_URL, OPEN_AI_API_KEY and OPEN_AI_MODEL.
// AI_PROVIDER picks when more than one is configured.
export type Provider = "claude" | "gemini" | "open";

export function pickProvider(env: (k: string) => string | undefined): Provider | null {
  const has = {
    claude: !!env("ANTHROPIC_API_KEY"),
    gemini: !!env("GEMINI_API_KEY"),
    open: !!env("OPEN_AI_BASE_URL") && !!env("OPEN_AI_MODEL"),
  };
  const preferred = (env("AI_PROVIDER") ?? "").toLowerCase();
  if (preferred === "open" && has.open) return "open";
  if (preferred === "gemini" && has.gemini) return "gemini";
  if (preferred === "claude" && has.claude) return "claude";
  if (has.claude) return "claude";
  if (has.gemini) return "gemini";
  if (has.open) return "open";
  return null;
}

// Read an SSE body and yield the text pieces a callback pulls out of each
// frame. Frames can arrive split across chunks, so the buffer is kept.
export async function* sseText(
  body: ReadableStream<Uint8Array>,
  pick: (data: unknown) => string
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf("\n\n");
    while (cut !== -1) {
      const frame = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const text = pick(JSON.parse(payload));
          if (text) yield text;
        } catch {
          /* a partial or non-JSON frame — ignore it */
        }
      }
      cut = buffer.indexOf("\n\n");
    }
  }
}

// Ask a chat-completions service which models it will accept. Used to turn
// "that model does not exist" into a list of ones that do.
async function listModels(baseUrl: string, key: string): Promise<string[]> {
  try {
    const resp = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const rows: unknown[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return rows
      .map((m) => (m as { id?: string })?.id)
      .filter((id): id is string => typeof id === "string")
      .sort();
  } catch {
    return [];
  }
}

// Any chat-completions service: GLM, Groq, Mistral, DeepSeek, OpenRouter...
export async function openCompatStream(
  baseUrl: string,
  key: string,
  model: string,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<AsyncIterable<string>> {
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!resp.ok || !resp.body) {
    const detail = resp.body ? (await resp.text()).slice(0, 200) : "";
    // A wrong model name is the most common setup mistake, and the service
    // knows which ones it has — so ask, and name them in the error.
    let hint = "";
    if (resp.status === 404 || /model/i.test(detail)) {
      const names = await listModels(baseUrl, key);
      if (names.length) hint = ` Models available to you: ${names.slice(0, 12).join(", ")}.`;
    }
    const err = new Error(`AI service ${resp.status}: ${detail}${hint}`) as Error & { status?: number };
    err.status = resp.status;
    throw err;
  }
  return sseText(resp.body, (d) => (d as {
    choices?: { delta?: { content?: string } }[];
  })?.choices?.[0]?.delta?.content ?? "");
}

// Gemini's streaming endpoint, re-shaped into the same pieces of text.
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
  return sseText(resp.body, (d) =>
    ((d as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      ?.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
  );
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
    const provider = pickProvider(env);
    if (!provider) {
      console.error("No AI provider configured");
      return new Response(JSON.stringify({
        error: "AI is not set up yet",
        detail: "No AI key is configured in Supabase. Add ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPEN_AI_BASE_URL + OPEN_AI_MODEL.",
      }), {
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
        textStream = await geminiStream(env("GEMINI_API_KEY")!, SYSTEM_PROMPT, merged);
      } else if (provider === "open") {
        textStream = await openCompatStream(
          env("OPEN_AI_BASE_URL")!,
          env("OPEN_AI_API_KEY") ?? "",
          env("OPEN_AI_MODEL")!,
          SYSTEM_PROMPT,
          merged
        );
      } else {
        const anthropic = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY")! });
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
        return new Response(JSON.stringify({ error: provider === "claude" ? "AI credits exhausted. Please add funds." : "The AI limit was reached. Try again shortly." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const raw = err instanceof Error ? err.message : String(err);
      // Never echo a key back, even if a provider quoted it in its error
      const safe = raw.replace(/(gsk_|sk-ant-|sk-|AIza)[A-Za-z0-9_\-]{6,}/g, "[key]").slice(0, 600);
      return new Response(JSON.stringify({
        error: "AI service unavailable",
        detail: `${provider}: ${safe}`,
      }), {
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
