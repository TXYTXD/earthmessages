const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 20 } = await req.json();
    const API_KEY = Deno.env.get('GIPHY_API_KEY');

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GIPHY_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const endpoint = query?.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=${limit}&rating=g`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      console.error('GIPHY API error:', data);
      return new Response(
        JSON.stringify({ error: 'GIPHY API error', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gifs = (data.data || []).map((r: any) => ({
      id: r.id,
      title: r.title || '',
      preview: r.images?.fixed_width_small?.url || r.images?.fixed_width?.url || '',
      url: r.images?.original?.url || r.images?.fixed_width?.url || '',
      width: parseInt(r.images?.original?.width || '200'),
      height: parseInt(r.images?.original?.height || '200'),
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
