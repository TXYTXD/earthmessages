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
    // Tenor v1 anonymous key
    const ANON_KEY = 'LIVDSRZULELA';

    const endpoint = query?.trim()
      ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${ANON_KEY}&limit=${limit}&media_filter=basic`
      : `https://g.tenor.com/v1/trending?key=${ANON_KEY}&limit=${limit}&media_filter=basic`;

    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tenor API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Tenor API error', gifs: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    const gifs = (data.results || []).map((r: any) => ({
      id: r.id,
      title: r.title || '',
      preview: r.media?.[0]?.nanogif?.url || r.media?.[0]?.tinygif?.url || '',
      url: r.media?.[0]?.mediumgif?.url || r.media?.[0]?.gif?.url || '',
      width: r.media?.[0]?.mediumgif?.dims?.[0] || 200,
      height: r.media?.[0]?.mediumgif?.dims?.[1] || 200,
    }));

    return new Response(
      JSON.stringify({ gifs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('GIF search error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search GIFs', gifs: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
