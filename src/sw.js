// UMS Messages service worker — notifications ONLY.
// Deliberately has NO fetch handler: nothing is ever cached here, so the
// app can never get stuck on a stale version because of this worker.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
