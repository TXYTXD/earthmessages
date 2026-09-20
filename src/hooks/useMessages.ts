import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationSound } from "./useNotificationSound";
import { toast } from "@/hooks/use-toast";
import { encryptMessage, decryptMessage, getConversationKey, isEncrypted } from "@/lib/encryption";

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
  sender_verified?: boolean;
  reactions: MessageReaction[];
  reply_to?: Message | null;
  is_encrypted?: boolean;
  /** Still on its way to the server */
  sending?: boolean;
  /** The server refused it */
  failed?: boolean;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  user_id: string;
  user_name?: string;
}

/** How many messages are loaded at a time; older ones load on demand. */
const PAGE_SIZE = 100;

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const { playMessageSound } = useNotificationSound();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  // Set when this person has cleared the chat; anything older stays hidden
  const clearedAtRef = useRef<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Turn raw message rows into everything the UI needs: sender names,
  // reactions, replies and decrypted text. Shared by the first page and by
  // older pages loaded afterwards.
  const hydrate = useCallback(async (msgs: any[]): Promise<Message[]> => {
    if (!msgs.length || !conversationId) return [];
    // Fetch sender profiles
    const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, is_verified")
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

    // Get conversation encryption key
    const encKey = await getConversationKey(conversationId);

    const result: Message[] = await Promise.all(
      msgs.map(async (msg) => {
        const profile = profileMap.get(msg.sender_id);
        const replyMsg = msg.reply_to_id ? replyMap.get(msg.reply_to_id) : null;
        let replyTo: Message | null = null;
        if (replyMsg) {
          const replyProfile = profileMap.get(replyMsg.sender_id);
          const replyContent = replyMsg.content
            ? await decryptMessage(replyMsg.content, encKey)
            : replyMsg.content;
          replyTo = {
            ...replyMsg,
            content: replyContent,
            sender_name: replyProfile?.display_name || "Unknown",
            reactions: [],
            is_encrypted: isEncrypted(replyMsg.content),
          };
        }

        const decryptedContent = msg.content
          ? await decryptMessage(msg.content, encKey)
          : msg.content;

        return {
          ...msg,
          content: decryptedContent,
          sender_name: profile?.display_name || "Unknown",
          sender_avatar: (profile?.display_name || "?").slice(0, 2).toUpperCase(),
          sender_verified: (profile as any)?.is_verified || false,
          reactions: reactionsByMsg.get(msg.id) || [],
          reply_to: replyTo,
          is_encrypted: isEncrypted(msg.content),
        };
      })
    );
    return result;
  }, [conversationId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoading(true);

    // Has this person cleared this chat? Anything before that is theirs to
    // not see again, even though it still exists for everyone else.
    const { data: clearRow } = await (supabase.from("conversation_clears") as any)
      .select("cleared_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    clearedAtRef.current = clearRow?.cleared_at ?? null;

    // Newest first, then flipped back — asking for the oldest hundred meant
    // a long conversation never showed anything recent.
    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId);
    if (clearedAtRef.current) query = query.gt("created_at", clearedAtRef.current);
    const { data: newestFirst } = await query
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!newestFirst) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setHasOlder(newestFirst.length === PAGE_SIZE);
    const msgs = [...newestFirst].reverse();

    const result = await hydrate(newestFirst.slice().reverse());

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

  // Helper to enrich a raw message row with profile info
  const enrichMessage = useCallback(async (msg: any): Promise<Message> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, is_verified")
      .eq("user_id", msg.sender_id)
      .single();

    let replyTo: Message | null = null;
    if (msg.reply_to_id) {
      const { data: replyMsg } = await supabase
        .from("messages")
        .select("*")
        .eq("id", msg.reply_to_id)
        .single();
      if (replyMsg) {
        const { data: replyProfile } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, is_verified")
          .eq("user_id", replyMsg.sender_id)
          .single();

        const encKey = msg.conversation_id ? await getConversationKey(msg.conversation_id) : null;
        const replyContent = replyMsg.content && encKey
          ? await decryptMessage(replyMsg.content, encKey)
          : replyMsg.content;

        replyTo = {
          ...replyMsg,
          content: replyContent,
          sender_name: replyProfile?.display_name || "Unknown",
          sender_avatar: (replyProfile?.display_name || "?").slice(0, 2).toUpperCase(),
          reactions: [],
          reply_to: null,
          is_encrypted: isEncrypted(replyMsg.content),
        };
      }
    }

    const encKey = msg.conversation_id ? await getConversationKey(msg.conversation_id) : null;
    const decryptedContent = msg.content && encKey
      ? await decryptMessage(msg.content, encKey)
      : msg.content;

    return {
      ...msg,
      content: decryptedContent,
      sender_name: profile?.display_name || "Unknown",
      sender_avatar: (profile?.display_name || "?").slice(0, 2).toUpperCase(),
      sender_verified: (profile as any)?.is_verified || false,
      reactions: [],
      reply_to: replyTo,
      is_encrypted: isEncrypted(msg.content),
    };
  }, []);

  // Realtime subscription - handle changes inline instead of refetching
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = await enrichMessage(payload.new);
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Play sound for messages from others
          if (newMsg.sender_id !== user?.id) {
            playMessageSound();
          }
          // Mark as read
          if (user) {
            await supabase.from("message_read_receipts").upsert(
              {
                conversation_id: conversationId,
                user_id: user.id,
                last_read_message_id: newMsg.id,
                read_at: new Date().toISOString(),
              },
              { onConflict: "conversation_id,user_id" }
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          let decryptedContent = updated.content;
          if (updated.content && conversationId) {
            const encKey = await getConversationKey(conversationId);
            decryptedContent = await decryptMessage(updated.content, encKey);
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, content: decryptedContent, is_edited: updated.is_edited, deleted_at: updated.deleted_at, is_encrypted: isEncrypted(updated.content) }
                : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        async (payload) => {
          // Refresh reactions for the affected message
          const messageId = (payload.new as any)?.message_id || (payload.old as any)?.message_id;
          if (!messageId) return;
          const { data: reactions } = await supabase
            .from("message_reactions")
            .select("*")
            .eq("message_id", messageId);
          if (!reactions) return;

          // Get profile names for reactions
          const userIds = [...new Set(reactions.map((r) => r.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", userIds);
          const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

          const enrichedReactions: MessageReaction[] = reactions.map((r) => ({
            ...r,
            user_name: profileMap.get(r.user_id)?.display_name || "Unknown",
          }));

          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions: enrichedReactions } : m))
          );
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
  }, [conversationId, user, enrichMessage]);

  // Nothing is ever dropped — the rest of the history is a scroll away.
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !hasOlder || loadingOlder) return;
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      let olderQuery = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .lt("created_at", oldest.created_at);
      if (clearedAtRef.current) olderQuery = olderQuery.gt("created_at", clearedAtRef.current);
      const { data: older } = await olderQuery
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      setHasOlder((older?.length ?? 0) === PAGE_SIZE);
      if (older?.length) {
        const hydrated = await hydrate(older.slice().reverse());
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...hydrated.filter((m) => !seen.has(m.id)), ...prev];
        });
      }
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasOlder, loadingOlder, messages, hydrate]);

  // Clear this conversation for yourself. The other person keeps theirs.
  const clearChat = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !user) return false;
    const now = new Date().toISOString();
    const { error } = await (supabase.from("conversation_clears") as any).upsert(
      { user_id: user.id, conversation_id: conversationId, cleared_at: now },
      { onConflict: "user_id,conversation_id" }
    );
    if (error) {
      console.error("Failed to clear chat:", error);
      return false;
    }
    clearedAtRef.current = now;
    setMessages([]);
    setHasOlder(false);
    return true;
  }, [conversationId, user]);

  const sendMessage = async (
    content: string,
    type: string = "text",
    mediaUrl?: string,
    mediaMetadata?: any,
    replyToId?: string
  ) => {
    if (!user || !conversationId) return;

    // Show it straight away rather than after a round trip to the server and
    // back. The id is replaced when the real row arrives.
    const pendingId = `pending-${crypto.randomUUID()}`;
    const optimistic: Message = {
      id: pendingId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      type,
      media_url: mediaUrl || null,
      media_metadata: mediaMetadata || null,
      reply_to_id: replyToId || null,
      is_edited: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      reactions: [],
      reply_to: messages.find((m) => m.id === replyToId) ?? null,
      sending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    // Encrypt text messages before storing
    let encryptedContent = content;
    if (type === "text" && content) {
      const encKey = await getConversationKey(conversationId);
      encryptedContent = await encryptMessage(content, encKey);
    }

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: encryptedContent,
        type,
        media_url: mediaUrl || null,
        media_metadata: mediaMetadata || null,
        reply_to_id: replyToId || null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      // Leave it visible but marked, so nothing typed is silently lost
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, sending: false, failed: true } : m))
      );
      // Most common cause: muted in this community by its owner
      toast({
        title: "Message not sent",
        description: "You may have been muted in this community.",
        variant: "destructive",
      });
    } else if (inserted) {
      // Adopt the real id so the realtime echo does not duplicate it
      setMessages((prev) => {
        if (prev.some((m) => m.id === inserted.id)) {
          return prev.filter((m) => m.id !== pendingId);
        }
        return prev.map((m) =>
          m.id === pendingId
            ? { ...m, id: inserted.id, created_at: inserted.created_at, sending: false }
            : m
        );
      });
    }

    // Clear typing
    await supabase
      .from("typing_indicators")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user || !conversationId) return;
    const encKey = await getConversationKey(conversationId);
    const encrypted = await encryptMessage(newContent, encKey);
    await supabase
      .from("messages")
      .update({ content: encrypted, is_edited: true })
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
    hasOlder,
    loadingOlder,
    loadOlderMessages,
    clearChat,
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
