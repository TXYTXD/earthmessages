import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: string;
  media_url: string | null;
  media_metadata: any;
  reply_to_id: string | null;
  is_edited: boolean;
  deleted_at: string | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
  reactions: MessageReaction[];
  reply_to?: Message | null;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  user_id: string;
  user_name?: string;
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoading(true);

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!msgs) {
      setMessages([]);
      setLoading(false);
      return;
    }

    // Fetch sender profiles
    const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", senderIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Fetch reactions
    const msgIds = msgs.map((m) => m.id);
    const { data: reactions } = await supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", msgIds);

    const reactionsByMsg = new Map<string, MessageReaction[]>();
    reactions?.forEach((r) => {
      const list = reactionsByMsg.get(r.message_id) || [];
      const profile = profileMap.get(r.user_id);
      list.push({ ...r, user_name: profile?.display_name || "Unknown" });
      reactionsByMsg.set(r.message_id, list);
    });

    // Build reply map
    const replyIds = msgs.filter((m) => m.reply_to_id).map((m) => m.reply_to_id!);
    const replyMap = new Map<string, any>();
    if (replyIds.length > 0) {
      const { data: replies } = await supabase
        .from("messages")
        .select("*")
        .in("id", replyIds);
      replies?.forEach((r) => replyMap.set(r.id, r));
    }

    const result: Message[] = msgs.map((msg) => {
      const profile = profileMap.get(msg.sender_id);
      const replyMsg = msg.reply_to_id ? replyMap.get(msg.reply_to_id) : null;
      let replyTo: Message | null = null;
      if (replyMsg) {
        const replyProfile = profileMap.get(replyMsg.sender_id);
        replyTo = {
          ...replyMsg,
          sender_name: replyProfile?.display_name || "Unknown",
          reactions: [],
        };
      }
      return {
        ...msg,
        sender_name: profile?.display_name || "Unknown",
        sender_avatar: (profile?.display_name || "?").slice(0, 2).toUpperCase(),
        reactions: reactionsByMsg.get(msg.id) || [],
        reply_to: replyTo,
      };
    });

    setMessages(result);
    setLoading(false);

    // Mark as read
    await supabase.from("message_read_receipts").upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
        last_read_message_id: msgs[msgs.length - 1]?.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_id" }
    );
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          fetchMessages();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          const { data } = await supabase
            .from("typing_indicators")
            .select("user_id")
            .eq("conversation_id", conversationId)
            .neq("user_id", user?.id || "");

          if (data) {
            const userIds = data.map((t) => t.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, display_name")
              .in("user_id", userIds);
            setTypingUsers(profiles?.map((p) => p.display_name || "Someone") || []);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, fetchMessages]);

  const sendMessage = async (
    content: string,
    type: string = "text",
    mediaUrl?: string,
    mediaMetadata?: any,
    replyToId?: string
  ) => {
    if (!user || !conversationId) return;

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      type,
      media_url: mediaUrl || null,
      media_metadata: mediaMetadata || null,
      reply_to_id: replyToId || null,
    });

    // Clear typing
    await supabase
      .from("typing_indicators")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ content: newContent, is_edited: true })
      .eq("id", messageId)
      .eq("sender_id", user.id);
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("sender_id", user.id);
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("message_reactions")
      .insert({ message_id: messageId, user_id: user.id, emoji });

    // If already exists, remove it (toggle)
    if (error?.code === "23505") {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    }
  };

  const setTyping = async () => {
    if (!user || !conversationId) return;

    await supabase.from("typing_indicators").upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
        started_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_id" }
    );

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from("typing_indicators")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
    }, 3000);
  };

  return {
    messages,
    loading,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    setTyping,
    refetch: fetchMessages,
  };
}
