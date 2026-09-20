import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PRESENCE_WINDOW_MS } from "@/lib/presence";

export function useOnlineStatus() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const setOnline = async () => {
      await supabase.from("user_status").upsert(
        { user_id: user.id, is_online: true, last_seen: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    };

    const setOffline = async () => {
      await supabase.from("user_status").upsert(
        { user_id: user.id, is_online: false, last_seen: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    };

    setOnline();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") setOnline();
      else setOffline();
    };

    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    // Phones frequently kill a page without ever firing beforeunload;
    // pagehide is the one that actually fires there.
    window.addEventListener("pagehide", handleBeforeUnload);

    // Beat comfortably more often than the window others judge us by, so a
    // single missed beat does not make us look offline.
    const heartbeat = setInterval(setOnline, Math.floor(PRESENCE_WINDOW_MS / 3));

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      clearInterval(heartbeat);
      setOffline();
    };
  }, [user]);
}
