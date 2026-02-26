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
    const apiKey = Deno.env.get('GIPHY_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GIPHY_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const endpoint = query?.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=g`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      console.error('GIPHY API error:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'GIPHY API error' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gifs = (data.data || []).map((g: any) => ({
      id: g.id,
      title: g.title || '',
      preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url || '',
      url: g.images?.original?.url || '',
      width: parseInt(g.images?.original?.width) || 200,
      height: parseInt(g.images?.original?.height) || 200,
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
