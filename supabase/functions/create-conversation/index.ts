import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create anon client to get user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for all DB operations (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { type, otherUserId, name, memberIds } = await req.json();

    if (type === "direct") {
      if (!otherUserId) {
        return new Response(JSON.stringify({ error: "otherUserId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if direct conversation already exists between these two users
      const { data: myMemberships } = await adminClient
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myMemberships) {
        for (const m of myMemberships) {
          const { data: otherMember } = await adminClient
            .from("conversation_members")
            .select("conversation_id")
            .eq("conversation_id", m.conversation_id)
            .eq("user_id", otherUserId)
            .maybeSingle();

          if (otherMember) {
            const { data: conv } = await adminClient
              .from("conversations")
              .select("id, type")
              .eq("id", m.conversation_id)
              .eq("type", "direct")
              .maybeSingle();

            if (conv) {
              return new Response(JSON.stringify({ conversationId: conv.id }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }
      }

      // Create new direct conversation
      const { data: newConv, error: convErr } = await adminClient
        .from("conversations")
        .insert({ type: "direct", created_by: user.id })
        .select("id")
        .single();

      if (convErr || !newConv) {
        console.error("Failed to create conversation:", convErr);
        return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add both members
      await adminClient.from("conversation_members").insert([
        { conversation_id: newConv.id, user_id: user.id, role: "admin" },
        { conversation_id: newConv.id, user_id: otherUserId, role: "admin" },
      ]);

      return new Response(JSON.stringify({ conversationId: newConv.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (type === "group") {
      if (!name || !memberIds || !Array.isArray(memberIds)) {
        return new Response(JSON.stringify({ error: "name and memberIds required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newConv, error: convErr } = await adminClient
        .from("conversations")
        .insert({ type: "group", name, created_by: user.id })
        .select("id")
        .single();

      if (convErr || !newConv) {
        return new Response(JSON.stringify({ error: "Failed to create group" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add creator as admin + other members
      const members = [
        { conversation_id: newConv.id, user_id: user.id, role: "admin" },
        ...memberIds.map((uid: string) => ({
          conversation_id: newConv.id,
          user_id: uid,
          role: "member",
        })),
      ];

      await adminClient.from("conversation_members").insert(members);

      // System message
      await adminClient.from("messages").insert({
        conversation_id: newConv.id,
        sender_id: user.id,
        content: "Group created",
        type: "system",
      });

      return new Response(JSON.stringify({ conversationId: newConv.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
