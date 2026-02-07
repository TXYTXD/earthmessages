import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

    // Heartbeat every 30s
    const heartbeat = setInterval(setOnline, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(heartbeat);
      setOffline();
    };
  }, [user]);
}
