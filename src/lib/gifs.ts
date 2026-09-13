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

// Which library is serving GIFs. Tenor (via the gif-search function) when
// a key is configured; otherwise Wikimedia Commons, which is free, open and
// needs no account, queried straight from the browser.
let provider: "tenor" | "wikimedia" | "unknown" = "unknown";
export const gifProviderName = () => (provider === "wikimedia" ? "Wikimedia Commons" : "Tenor");

async function tenorGifs(q: string, limit: number): Promise<GifResult[]> {
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
  return data?.gifs ?? [];
}

interface CommonsPage {
  pageid: number;
  title: string;
  imageinfo?: { url: string; thumburl?: string; width: number; height: number; size: number; mime: string }[];
}

async function wikimediaGifs(q: string, limit: number): Promise<GifResult[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: q ? `filemime:image/gif ${q}` : "filemime:image/gif animation",
    gsrnamespace: "6",
    gsrlimit: String(Math.min(limit, 50)),
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: "240",
    format: "json",
    origin: "*",
  });
  if (!q) params.set("gsrsort", "random");
  const resp = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!resp.ok) throw new Error(`commons ${resp.status}`);
  const data = await resp.json();
  const pages = Object.values((data?.query?.pages ?? {}) as Record<string, CommonsPage>);
  return pages
    .map((p): GifResult | null => {
      const ii = p.imageinfo?.[0];
      if (!ii || ii.mime !== "image/gif" || ii.size > 8 * 1024 * 1024) return null;
      const preview = ii.thumburl || ii.url;
      // A 480px rendition keeps chat bubbles light; small originals are sent as-is
      const url = ii.width <= 480 || !ii.thumburl ? ii.url : ii.thumburl.replace("/240px-", "/480px-");
      return {
        id: String(p.pageid),
        title: p.title.replace(/^File:/, "").replace(/\.gif$/i, ""),
        preview,
        url,
        width: ii.width,
        height: ii.height,
      };
    })
    .filter((g): g is GifResult => g !== null);
}

export async function searchGifs(query: string, limit = 24): Promise<GifResult[]> {
  const q = query.trim().toLowerCase();
  const hit = memory.get(q);
  if (hit) return hit;
  const pending = inflight.get(q);
  if (pending) return pending;

  const p = (async () => {
    let gifs: GifResult[] = [];
    if (provider !== "wikimedia") {
      try {
        gifs = await tenorGifs(q, limit);
        provider = "tenor";
      } catch (e) {
        // No Tenor key configured → fall back to the free library for this session
        if (String((e as Error)?.message || "").includes("TENOR_API_KEY")) provider = "wikimedia";
        else throw e;
      }
    }
    if (provider === "wikimedia") gifs = await wikimediaGifs(q, limit);
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
