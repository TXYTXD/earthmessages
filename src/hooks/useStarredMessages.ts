import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useStarredMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const fetchStarred = useCallback(async () => {
    if (!user || !conversationId) return;
    const { data } = await supabase
      .from("starred_messages")
      .select("message_id")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId);
    setStarredIds(new Set(data?.map((d) => d.message_id) || []));
  }, [user, conversationId]);

  useEffect(() => {
    fetchStarred();
  }, [fetchStarred]);

  const toggleStar = async (messageId: string) => {
    if (!user || !conversationId) return;
    if (starredIds.has(messageId)) {
      await supabase
        .from("starred_messages")
        .delete()
        .eq("user_id", user.id)
        .eq("message_id", messageId);
      setStarredIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    } else {
      await supabase.from("starred_messages").insert({
        user_id: user.id,
        message_id: messageId,
        conversation_id: conversationId,
      });
      setStarredIds((prev) => new Set(prev).add(messageId));
    }
  };

  return { starredIds, toggleStar };
}
