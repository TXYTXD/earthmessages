import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { encryptMessage, getConversationKey } from "@/lib/encryption";
import { toast } from "sonner";

export interface ScheduledMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: string;
  media_url: string | null;
  scheduled_at: string;
  status: string;
  created_at: string;
}

export function useScheduledMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchScheduled = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoading(true);
    const { data } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("sender_id", user.id)
      .eq("status", "pending")
      .order("scheduled_at", { ascending: true });

    setScheduledMessages((data as ScheduledMessage[]) || []);
    setLoading(false);
  }, [conversationId, user]);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const scheduleMessage = async (
    content: string,
    scheduledAt: Date,
    type: string = "text",
    mediaUrl?: string,
    mediaMetadata?: any,
    replyToId?: string
  ) => {
    if (!conversationId || !user) return;

    // Encrypt text content
    let encryptedContent = content;
    if (type === "text" && content) {
      const encKey = await getConversationKey(conversationId);
      encryptedContent = await encryptMessage(content, encKey);
    }

    const { error } = await supabase.from("scheduled_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: encryptedContent,
      type,
      media_url: mediaUrl || null,
      media_metadata: mediaMetadata || null,
      reply_to_id: replyToId || null,
      scheduled_at: scheduledAt.toISOString(),
    } as any);

    if (error) {
      toast.error("Failed to schedule message");
      console.error("Schedule error:", error);
      return;
    }

    toast.success(`Message scheduled for ${scheduledAt.toLocaleString()}`);
    fetchScheduled();
  };

  const cancelScheduled = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_messages")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to cancel scheduled message");
      return;
    }

    toast.success("Scheduled message cancelled");
    fetchScheduled();
  };

  return {
    scheduledMessages,
    loading,
    scheduleMessage,
    cancelScheduled,
    refetch: fetchScheduled,
  };
}
