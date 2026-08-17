// UMS Messages service worker — call notifications ONLY.
// Deliberately has NO fetch handler: nothing is ever cached here, so the
// app can never get stuck on a stale version because of this worker.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Accept/Decline buttons on incoming-call notifications. The page shows
// the notification (with data.callId/callType); we relay the chosen
// action back to the app, focusing or opening a window when needed.
self.addEventListener("notificationclick", (event) => {
  const data = (event.notification && event.notification.data) || {};
  const action = event.action || "open";
  event.notification.close();

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      let client = wins[0] || null;
      if (client && "focus" in client) {
        try { await client.focus(); } catch { /* ignore */ }
      }
      if (!client && action !== "decline") {
        try { client = await self.clients.openWindow("/"); } catch { /* ignore */ }
      }
      const targets = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of targets) {
        c.postMessage({ type: "call-action", action, callId: data.callId, callType: data.callType });
      }
    })()
  );
});
