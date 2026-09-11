import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Sends Web Push notifications for new messages and incoming calls.
//
//   GET  /send-push            -> { publicKey }  (VAPID key for subscribing)
//   POST /send-push {table,id} -> called by the database trigger notify_push
//
// The POST body is never trusted: the row is re-read with the service role
// and recipients are derived from the database. Every record is pushed at
// most once (push_log), and only if it is recent.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@umsmessages.net";

async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const { data } = await admin.from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
  if (data) return { publicKey: data.public_key, privateKey: data.private_key };
  const keys = webpush.generateVAPIDKeys();
  const { error } = await admin
    .from("push_config")
    .insert({ id: 1, public_key: keys.publicKey, private_key: keys.privateKey });
  if (error) {
    // Lost a race with another instance — read what won
    const { data: again } = await admin.from("push_config").select("public_key, private_key").eq("id", 1).single();
    return { publicKey: again!.public_key, privateKey: again!.private_key };
  }
  return keys;
}

interface Payload {
  title: string;
  body: string;
  tag: string;
  data: Record<string, unknown>;
  requireInteraction?: boolean;
  actions?: { action: string; title: string }[];
}

async function sendToUsers(userIds: string[], payload: Payload) {
  if (userIds.length === 0) return { sent: 0 };
  const { publicKey, privateKey } = await getVapidKeys();
  webpush.setVapidDetails(SUBJECT, publicKey, privateKey);

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: payload.requireInteraction ? 45 : 60 * 60 * 24, urgency: "high" }
        );
        sent++;
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
        else console.error("push failed:", code, e?.body ?? e);
      }
    })
  );
  if (dead.length) await admin.from("push_subscriptions").delete().in("id", dead);
  return { sent };
}

async function displayName(userId: string): Promise<string> {
  const { data } = await admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
  return data?.display_name || "Someone";
}

function messagePreview(m: { type: string; content: string | null }): string {
  switch (m.type) {
    case "image": return "📷 Photo";
    case "gif": return "GIF";
    case "voice": return "🎤 Voice message";
    case "file": return "📎 File";
    case "sticker": return "Sticker";
    default: return (m.content || "New message").slice(0, 140);
  }
}

async function handleMessage(id: string) {
  const { data: m } = await admin
    .from("messages")
    .select("id, conversation_id, sender_id, content, type, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!m || m.type === "system") return { skipped: "no message" };
  if (Date.now() - new Date(m.created_at).getTime() > 5 * 60 * 1000) return { skipped: "stale" };

  // Communities can be large and public — no pushes for them (for now)
  const { data: community } = await admin
    .from("communities").select("id").eq("conversation_id", m.conversation_id).maybeSingle();
  if (community) return { skipped: "community" };

  const { data: conv } = await admin
    .from("conversations").select("type, name").eq("id", m.conversation_id).maybeSingle();
  const { data: members } = await admin
    .from("conversation_members")
    .select("user_id, is_muted")
    .eq("conversation_id", m.conversation_id);
  let recipients = (members ?? [])
    .filter((x) => x.user_id !== m.sender_id && !x.is_muted)
    .map((x) => x.user_id);
  if (recipients.length === 0) return { sent: 0 };

  // Respect blocks: people who blocked the sender get nothing
  const { data: blocks } = await admin
    .from("blocked_users").select("blocker_id").eq("blocked_id", m.sender_id).in("blocker_id", recipients);
  const blockedBy = new Set((blocks ?? []).map((b) => b.blocker_id));
  recipients = recipients.filter((r) => !blockedBy.has(r));

  const sender = await displayName(m.sender_id);
  const isGroup = conv?.type === "group";
  return sendToUsers(recipients, {
    title: isGroup && conv?.name ? `${sender} · ${conv.name}` : sender,
    body: messagePreview(m),
    tag: `chat-${m.conversation_id}`,
    data: { url: `/?chat=${m.conversation_id}`, conversationId: m.conversation_id },
  });
}

async function handleCall(id: string) {
  const { data: c } = await admin
    .from("call_records")
    .select("id, caller_id, receiver_id, type, status, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!c || c.status !== "ringing") return { skipped: "not ringing" };
  if (Date.now() - new Date(c.created_at).getTime() > 60 * 1000) return { skipped: "stale" };

  const { data: blocked } = await admin
    .from("blocked_users").select("id").eq("blocker_id", c.receiver_id).eq("blocked_id", c.caller_id).maybeSingle();
  if (blocked) return { skipped: "blocked" };

  const caller = await displayName(c.caller_id);
  return sendToUsers([c.receiver_id], {
    title: `Incoming ${c.type} call`,
    body: `${caller} is calling you`,
    tag: `call-${c.id}`,
    requireInteraction: true,
    actions: [
      { action: "accept", title: "✅ Accept" },
      { action: "decline", title: "❌ Decline" },
    ],
    data: { callId: c.id, callType: c.type, url: `/?call=${c.id}&action=accept` },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      const { publicKey } = await getVapidKeys();
      return json({ publicKey });
    }

    const body = await req.json().catch(() => ({}));
    const table = String(body?.table ?? "");
    const id = String(body?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "bad id" }, 400);

    // Push at most once per record
    const { error: logErr } = await admin.from("push_log").insert({ record_id: id });
    if (logErr) return json({ skipped: "already pushed" });

    let result: unknown;
    if (table === "messages") result = await handleMessage(id);
    else if (table === "call_records") result = await handleCall(id);
    else return json({ error: "unknown table" }, 400);
    return json(result);
  } catch (e) {
    console.error("send-push error:", e);
    return json({ error: String(e) }, 500);
  }
});
