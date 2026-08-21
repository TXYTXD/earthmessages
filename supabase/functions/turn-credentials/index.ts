import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns fresh TURN relay credentials from metered.ca so calls can
// connect between different networks. The API key stays server-side —
// the client only ever sees short-lived credentials.
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

    // Option A: static TURN credentials from any provider (e.g. ExpressTURN).
    // TURN_URLS is comma-separated, e.g. "turn:relay1.expressturn.com:3480"
    const turnUrls = Deno.env.get("TURN_URLS");
    const turnUsername = Deno.env.get("TURN_USERNAME");
    const turnCredential = Deno.env.get("TURN_CREDENTIAL");
    if (turnUrls && turnUsername && turnCredential) {
      const iceServers = turnUrls.split(",").map((u) => ({
        urls: u.trim(),
        username: turnUsername,
        credential: turnCredential,
      }));
      return new Response(JSON.stringify({ iceServers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Option B: metered.ca API (fresh short-lived credentials)
    const apiKey = Deno.env.get("METERED_API_KEY");
    const domain = Deno.env.get("METERED_DOMAIN"); // e.g. umsmessages.metered.live
    if (!apiKey || !domain) {
      // Not configured yet — the app falls back to its built-in server list
      return new Response(JSON.stringify({ iceServers: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(
      `https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`
    );
    if (!resp.ok) {
      console.error("metered.ca error:", resp.status, await resp.text());
      return new Response(JSON.stringify({ iceServers: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const iceServers = await resp.json();

    return new Response(JSON.stringify({ iceServers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("turn-credentials error:", e);
    return new Response(JSON.stringify({ iceServers: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
