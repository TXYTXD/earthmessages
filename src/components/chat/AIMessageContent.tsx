import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

// The AI can request a GIF by emitting a tag like: [gif: happy dance]
const GIF_TAG = /\[gif:\s*([^\]]+)\]/gi;

function GifTag({ query }: { query: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("gif-search", {
          body: { query, limit: 1 },
        });
        const gif = data?.gifs?.[0];
        if (!active) return;
        if (gif?.url) setUrl(gif.url);
        else setFailed(true);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [query]);

  if (failed) return null;
  if (!url)
    return (
      <span className="text-xs text-muted-foreground italic">searching GIF…</span>
    );
  return (
    <img
      src={url}
      alt={query}
      className="rounded-lg max-w-full max-h-48 my-1"
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * Renders an AI message, converting any [gif: ...] tags into real animated GIFs
 * (fetched via the gif-search edge function) while rendering the rest as markdown.
 */
export function AIMessageContent({ content }: { content: string }) {
  const parts: Array<{ type: "text" | "gif"; value: string }> = [];
  let lastIndex = 0;
  const re = new RegExp(GIF_TAG);
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex)
      parts.push({ type: "text", value: content.slice(lastIndex, m.index) });
    parts.push({ type: "gif", value: m[1].trim() });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length)
    parts.push({ type: "text", value: content.slice(lastIndex) });

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
      {parts.map((p, i) =>
        p.type === "gif" ? (
          <GifTag key={i} query={p.value} />
        ) : (
          <ReactMarkdown key={i}>{p.value}</ReactMarkdown>
        )
      )}
    </div>
  );
}
