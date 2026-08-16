import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Blocking and reporting other users (Play Store UGC safety requirements).
// Blocked users' messages are hidden and their calls are ignored.
export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from("blocked_users") as any)
      .select("blocked_id")
      .eq("blocker_id", user.id);
    setBlockedIds(new Set((data || []).map((r: any) => r.blocked_id)));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const blockUser = useCallback(
    async (userId: string) => {
      if (!user) return false;
      const { error } = await (supabase.from("blocked_users") as any).insert({
        blocker_id: user.id,
        blocked_id: userId,
      });
      if (error && !`${error.message}`.includes("duplicate")) {
        toast.error("Could not block this user");
        return false;
      }
      setBlockedIds((prev) => new Set(prev).add(userId));
      toast.success("User blocked. You won't see their messages or calls.");
      return true;
    },
    [user]
  );

  const unblockUser = useCallback(
    async (userId: string) => {
      if (!user) return false;
      await (supabase.from("blocked_users") as any)
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", userId);
      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.success("User unblocked.");
      return true;
    },
    [user]
  );

  const reportUser = useCallback(
    async (userId: string, reason: string, details?: string) => {
      if (!user) return false;
      const { error } = await (supabase.from("user_reports") as any).insert({
        reporter_id: user.id,
        reported_user_id: userId,
        reason,
        details: details?.trim() || null,
      });
      if (error) {
        toast.error("Could not send the report");
        return false;
      }
      toast.success("Report sent. Thank you for helping keep UMS Messages safe.");
      return true;
    },
    [user]
  );

  return { blockedIds, blockUser, unblockUser, reportUser, refresh };
}
