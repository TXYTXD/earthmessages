import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Web Push: lets messages and calls reach this device when the app is closed.
// On iPhone/iPad this only works once the app is added to the Home Screen.

const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

export const pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const pushNeedsHomeScreen = () => isIOS() && !isStandalone();

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function fetchPublicKey(): Promise<string> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-push`);
  if (!resp.ok) throw new Error(`send-push returned ${resp.status}`);
  const data = await resp.json();
  if (!data?.publicKey) throw new Error("no push key");
  return data.publicKey;
}

// Subscribe this device and store the subscription for the signed-in user.
export async function subscribeToPush(userId: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const key = await fetchPublicKey();
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  const j = sub.toJSON();
  const row = {
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: j.keys?.p256dh ?? "",
    auth: j.keys?.auth ?? "",
    user_agent: navigator.userAgent.slice(0, 200),
    updated_at: new Date().toISOString(),
  };
  const { error } = await (supabase.from("push_subscriptions") as any).upsert(row, { onConflict: "endpoint" });
  if (error) throw error;
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await (supabase.from("push_subscriptions") as any).delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

// Keeps the device subscribed whenever permission is granted (so a
// re-login or a new session never silently loses notifications).
export function useAutoPushSubscribe() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user || !pushSupported()) return;
    if (Notification.permission !== "granted") return;
    if (localStorage.getItem("ums-push-off") === "1") return;
    subscribeToPush(user.id).catch((e) => console.warn("[Push] subscribe failed:", e));
  }, [user]);
}

// Settings-page state: current status and a toggle.
export function usePushToggle() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();
  const needsHomeScreen = pushNeedsHomeScreen();

  useEffect(() => {
    isPushSubscribed().then((v) => setEnabled(v && Notification.permission === "granted"));
  }, []);

  const toggle = useCallback(
    async (on: boolean): Promise<string | null> => {
      if (!user) return "Sign in first";
      if (!supported) return "This browser can't receive notifications";
      setBusy(true);
      try {
        if (on) {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") return "Notifications are blocked for this site — allow them in your browser settings";
          await subscribeToPush(user.id);
          localStorage.removeItem("ums-push-off");
          setEnabled(true);
        } else {
          await unsubscribeFromPush();
          localStorage.setItem("ums-push-off", "1");
          setEnabled(false);
        }
        return null;
      } catch (e) {
        console.warn("[Push] toggle failed:", e);
        return "Couldn't turn on notifications. Try again in a moment.";
      } finally {
        setBusy(false);
      }
    },
    [user, supported]
  );

  return { enabled, busy, supported, needsHomeScreen, toggle };
}
