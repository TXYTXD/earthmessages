import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns fresh TURN relay credentials (static, Twilio, Cloudflare or
// metered.ca — whichever secrets are set) so calls can connect between
// different networks. The API key stays server-side —
// the client only ever sees short-lived credentials.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // Human-readable notes about what went wrong (never includes secrets) —
  // shown on the Calls → Test card so problems can be diagnosed.
  const notes: string[] = [];

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
      return json({ iceServers, source: "static" });
    }

    // Option B: Twilio Network Traversal Service (short-lived credentials).
    // Both values are shown on the Twilio Console home page.
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (twilioSid && twilioToken) {
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioSid)}/Tokens.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${twilioSid}:${twilioToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "Ttl=3600",
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        const iceServers = (data.ice_servers ?? []).map((s: any) => ({
          urls: s.urls ?? s.url,
          ...(s.username ? { username: s.username, credential: s.credential } : {}),
        }));
        return json({ iceServers, source: "twilio" });
      }
      const text = await resp.text();
      console.error("twilio error:", resp.status, text);
      notes.push(`Twilio rejected the request (HTTP ${resp.status}): ${text.slice(0, 200)}`);
    } else if (twilioSid || twilioToken) {
      notes.push("Twilio: only one of TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN is set");
    }

    // Option C: Cloudflare Realtime TURN (short-lived credentials).
    const cfKeyId = Deno.env.get("CLOUDFLARE_TURN_KEY_ID");
    const cfApiToken = Deno.env.get("CLOUDFLARE_TURN_API_TOKEN");
    if (cfKeyId && cfApiToken) {
      const resp = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(cfKeyId)}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${cfApiToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ttl: 3600 }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        const list = Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers];
        return json({ iceServers: list, source: "cloudflare" });
      }
      const text = await resp.text();
      console.error("cloudflare turn error:", resp.status, text);
      notes.push(`Cloudflare rejected the request (HTTP ${resp.status}): ${text.slice(0, 200)}`);
    }

    // Option D: metered.ca API (fresh short-lived credentials)
    const apiKey = Deno.env.get("METERED_API_KEY");
    const domain = Deno.env.get("METERED_DOMAIN"); // e.g. umsmessages.metered.live
    if (!apiKey || !domain) {
      // Not configured yet — the app falls back to its built-in server list
      if (notes.length === 0) notes.push("No relay provider secrets are set in Supabase");
      return json({ iceServers: null, source: "none", notes });
    }

    const resp = await fetch(
      `https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`
    );
    if (!resp.ok) {
      const text = await resp.text();
      console.error("metered.ca error:", resp.status, text);
      notes.push(`metered.ca rejected the request (HTTP ${resp.status}): ${text.slice(0, 200)}`);
      return json({ iceServers: null, source: "none", notes });
    }
    const iceServers = await resp.json();
    return json({ iceServers, source: "metered" });
  } catch (e) {
    console.error("turn-credentials error:", e);
    notes.push(`Function error: ${String(e).slice(0, 200)}`);
    return json({ iceServers: null, source: "none", notes });
  }
});
