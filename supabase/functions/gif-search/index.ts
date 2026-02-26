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
    const API_KEY = Deno.env.get('TENOR_API_KEY');

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'TENOR_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const endpoint = query?.trim()
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${API_KEY}&limit=${limit}&media_filter=tinygif,gif&client_key=lovable`
      : `https://tenor.googleapis.com/v2/featured?key=${API_KEY}&limit=${limit}&media_filter=tinygif,gif&client_key=lovable`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      console.error('Tenor API error:', data);
      return new Response(
        JSON.stringify({ error: 'Tenor API error', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gifs = (data.results || []).map((r: any) => ({
      id: r.id,
      title: r.title || r.content_description || '',
      preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || '',
      url: r.media_formats?.gif?.url || '',
      width: r.media_formats?.gif?.dims?.[0] || 200,
      height: r.media_formats?.gif?.dims?.[1] || 200,
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
