import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// GIF search via Tenor v2 (needs TENOR_API_KEY — a Google API key with the
// Tenor API enabled). Results are cached in memory so repeated searches
// and the trending list come back instantly.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300' },
  });

interface Gif { id: string; title: string; preview: string; url: string; width: number; height: number }
const cache = new Map<string, { at: number; gifs: Gif[] }>();
const TTL = 10 * 60 * 1000;

async function tenorV2(query: string, limit: number, key: string): Promise<Gif[]> {
  const params = new URLSearchParams({
    key,
    client_key: 'ums-messages',
    limit: String(limit),
    media_filter: 'nanogif,tinygif,mediumgif,gif',
    contentfilter: 'medium',
  });
  const url = query
    ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&${params}`
    : `https://tenor.googleapis.com/v2/featured?${params}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Tenor ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  return (data.results || []).map((r: any) => {
    const f = r.media_formats || {};
    return {
      id: r.id,
      title: r.title || r.content_description || '',
      preview: f.nanogif?.url || f.tinygif?.url || f.gif?.url || '',
      url: f.mediumgif?.url || f.gif?.url || f.tinygif?.url || '',
      width: f.mediumgif?.dims?.[0] || f.gif?.dims?.[0] || 200,
      height: f.mediumgif?.dims?.[1] || f.gif?.dims?.[1] || 200,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized', gifs: [] }, 401);
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized', gifs: [] }, 401);

    const body = await req.json().catch(() => ({}));
    const query = String(body?.query ?? '').trim().slice(0, 100);
    const limit = Math.min(Math.max(Number(body?.limit) || 24, 1), 50);

    const cacheKey = `${query.toLowerCase()}|${limit}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL) return json({ gifs: hit.gifs, cached: true });

    const key = Deno.env.get('TENOR_API_KEY');
    if (!key) {
      return json({ error: 'GIFs are not set up yet (missing TENOR_API_KEY)', gifs: [] });
    }

    const gifs = await tenorV2(query, limit, key);
    cache.set(cacheKey, { at: Date.now(), gifs });
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return json({ gifs });
  } catch (error) {
    console.error('GIF search error:', error);
    return json({ error: 'Failed to search GIFs', gifs: [] });
  }
});
