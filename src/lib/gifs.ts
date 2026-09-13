import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export interface GifResult {
  id: string;
  title: string;
  preview: string;
  url: string;
  width: number;
  height: number;
}

// Fast GIF loading: results are cached in memory per search, the trending
// list is also kept in localStorage so the picker opens instantly, and
// trending is prefetched as soon as a chat is open.
const memory = new Map<string, GifResult[]>();
const inflight = new Map<string, Promise<GifResult[]>>();
const TRENDING_KEY = "ums-gifs-trending";

function readTrendingCache(): GifResult[] | null {
  try {
    const raw = localStorage.getItem(TRENDING_KEY);
    if (!raw) return null;
    const { at, gifs } = JSON.parse(raw);
    if (!Array.isArray(gifs) || Date.now() - at > 6 * 60 * 60 * 1000) return null;
    return gifs;
  } catch {
    return null;
  }
}

export function cachedGifs(query: string): GifResult[] | null {
  const q = query.trim().toLowerCase();
  return memory.get(q) ?? (q === "" ? readTrendingCache() : null);
}

export async function searchGifs(query: string, limit = 24): Promise<GifResult[]> {
  const q = query.trim().toLowerCase();
  const hit = memory.get(q);
  if (hit) return hit;
  const pending = inflight.get(q);
  if (pending) return pending;

  const p = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not signed in");
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/gif-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ query: q, limit }),
    });
    if (!resp.ok) throw new Error(`gif-search ${resp.status}`);
    const data = await resp.json();
    if (data?.error && !(data.gifs || []).length) throw new Error(String(data.error));
    const gifs: GifResult[] = data?.gifs ?? [];
    memory.set(q, gifs);
    if (q === "" && gifs.length) {
      try {
        localStorage.setItem(TRENDING_KEY, JSON.stringify({ at: Date.now(), gifs }));
      } catch {
        /* ignore */
      }
    }
    // Warm the browser cache for the thumbnails so the grid paints at once
    gifs.slice(0, 12).forEach((g) => {
      const img = new Image();
      img.src = g.preview || g.url;
    });
    return gifs;
  })();
  inflight.set(q, p);
  try {
    return await p;
  } finally {
    inflight.delete(q);
  }
}

export function prefetchTrendingGifs() {
  if (memory.has("")) return;
  searchGifs("").catch(() => {});
}
