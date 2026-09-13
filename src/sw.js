// UMS Messages service worker — notifications ONLY.
// Deliberately has NO fetch handler: nothing is ever cached here, so the
// app can never get stuck on a stale version because of this worker.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Message text is end-to-end encrypted; the server only forwards the
// ciphertext. If this device has the conversation key (saved by the app
// when the chat was opened), decrypt the preview here. Otherwise the
// notification just says "New message".
function loadConversationKey(conversationId) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("ums-push", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("keys");
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction("keys", "readonly");
          const get = tx.objectStore("keys").get(conversationId);
          get.onsuccess = () => { resolve(get.result || null); req.result.close(); };
          get.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
    } catch { resolve(null); }
  });
}

async function decryptPreview(encrypted, conversationId) {
  const PREFIX = "🔒:";
  if (!encrypted || !encrypted.startsWith(PREFIX)) return encrypted || null;
  try {
    const b64Key = await loadConversationKey(conversationId);
    if (!b64Key) return null;
    const raw = Uint8Array.from(atob(b64Key), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
    const combined = Uint8Array.from(atob(encrypted.slice(PREFIX.length)), (c) => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, key, combined.slice(12));
    const text = new TextDecoder().decode(plain).replace(/\s+/g, " ").trim();
    return text ? text.slice(0, 140) : null;
  } catch {
    return null;
  }
}

// Web Push from the send-push edge function: new messages and incoming
// calls arrive here even when the app is closed.
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: "UMS Messages", body: event.data && event.data.text() }; }
  const title = payload.title || "UMS Messages";
  const options = {
    body: payload.body || "",
    tag: payload.tag,
    renotify: !!payload.tag,
    requireInteraction: !!payload.requireInteraction,
    data: payload.data || {},
    actions: payload.actions || [],
    icon: "/favicon.png",
    badge: "/favicon.png",
    vibrate: payload.requireInteraction ? [400, 200, 400, 200, 400] : [120],
  };
  event.waitUntil(
    (async () => {
      if (payload.data && payload.data.encrypted) {
        const text = await decryptPreview(payload.data.encrypted, payload.data.conversationId);
        if (text) options.body = text;
      }
      // Don't pile up a call notification if the app is open and already ringing
      if (payload.data && payload.data.callId) {
        const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        if (wins.some((w) => w.visibilityState === "visible")) {
          const existing = await self.registration.getNotifications({ tag: options.tag });
          if (existing.length) return;
        }
      }
      await self.registration.showNotification(title, options);
    })()
  );
});

// Tapping a notification (or its Accept/Decline buttons). We focus an open
// window when there is one and tell it what happened; otherwise we open
// the app at a URL that makes it do the right thing on start-up.
self.addEventListener("notificationclick", (event) => {
  const data = (event.notification && event.notification.data) || {};
  const action = event.action || "open";
  event.notification.close();

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      let client = wins[0] || null;

      if (data.callId) {
        if (client) {
          try { await client.focus(); } catch { /* ignore */ }
          client.postMessage({ type: "call-action", action, callId: data.callId, callType: data.callType });
        } else if (action !== "decline") {
          try { await self.clients.openWindow(`/?call=${data.callId}&action=accept`); } catch { /* ignore */ }
        } else {
          try { await self.clients.openWindow(`/?call=${data.callId}&action=decline`); } catch { /* ignore */ }
        }
        return;
      }

      const url = data.url || "/";
      if (client) {
        try { await client.focus(); } catch { /* ignore */ }
        client.postMessage({ type: "open-url", url });
      } else {
        try { await self.clients.openWindow(url); } catch { /* ignore */ }
      }
    })()
  );
});
