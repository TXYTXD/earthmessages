import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Friend {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string | null;
  verified?: boolean;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    const { data: accepted } = await supabase
      .from("friend_requests")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!accepted || accepted.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const friendIds = accepted.map((r) =>
      r.sender_id === user.id ? r.receiver_id : r.sender_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, is_verified")
      .in("user_id", friendIds);

    const { data: statuses } = await supabase
      .from("user_status")
      .select("user_id, is_online, last_seen")
      .in("user_id", friendIds);

    const statusMap = new Map(statuses?.map((s) => [s.user_id, s]) || []);

    setFriends(
      (profiles || []).map((p) => {
        const status = statusMap.get(p.user_id);
        return {
          user_id: p.user_id,
          display_name: p.display_name || "Unknown",
          avatar_url: p.avatar_url,
          is_online: status?.is_online || false,
          last_seen: status?.last_seen || null,
          verified: (p as any).is_verified || false,
        };
      })
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return { friends, loading, refetch: fetchFriends };
}
