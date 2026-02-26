const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 24 } = await req.json();
    const ANON_KEY = 'LIVDSRZULELA';

    const endpoint = query?.trim()
      ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${ANON_KEY}&limit=${limit}&media_filter=minimal`
      : `https://g.tenor.com/v1/trending?key=${ANON_KEY}&limit=${limit}&media_filter=minimal`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      console.error('Tenor API error:', data);
      return new Response(
        JSON.stringify({ error: 'Tenor API error' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gifs = (data.results || []).map((r: any) => ({
      id: r.id,
      title: r.title || '',
      preview: r.media?.[0]?.tinygif?.url || r.media?.[0]?.gif?.url || '',
      url: r.media?.[0]?.gif?.url || '',
      width: r.media?.[0]?.gif?.dims?.[0] || 200,
      height: r.media?.[0]?.gif?.dims?.[1] || 200,
    }));

    return new Response(
      JSON.stringify({ gifs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('GIF search error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search GIFs' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
