import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  theme_color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Derived
  display_name: string;
  display_avatar: string;
  display_verified?: boolean;
  last_message?: string;
  last_message_time?: string;
  last_message_sender?: string;
  unread_count: number;
  is_online: boolean;
  members: ConversationMember[];
}

export interface ConversationMember {
  user_id: string;
  nickname: string | null;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  is_muted: boolean;
  is_pinned: boolean;
  verified?: boolean;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!user) return [];

    // Get all conversation IDs the user is a member of
    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id, is_muted, is_pinned")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setConversations([]);
      setLoading(false);
      return [];
    }

    const convIds = memberships.map((m) => m.conversation_id);

    // Fetch conversations
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds);

    if (!convs) {
      setConversations([]);
      setLoading(false);
      return [];
    }

    // Fetch all members for these conversations
    const { data: allMembers } = await supabase
      .from("conversation_members")
      .select("*")
      .in("conversation_id", convIds);

    // Fetch profiles for all members
    const allUserIds = [...new Set(allMembers?.map((m) => m.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, is_verified")
      .in("user_id", allUserIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Fetch last message for each conversation
    const lastMessages: Record<string, any> = {};
    for (const convId of convIds) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("content, created_at, sender_id, type")
        .eq("conversation_id", convId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (msgs && msgs.length > 0) lastMessages[convId] = msgs[0];
    }

    // Fetch read receipts
    const { data: receipts } = await supabase
      .from("message_read_receipts")
      .select("conversation_id, last_read_message_id")
      .eq("user_id", user.id)
      .in("conversation_id", convIds);

    const receiptMap = new Map(receipts?.map((r) => [r.conversation_id, r.last_read_message_id]) || []);

    // Fetch online status
    const { data: statuses } = await supabase
      .from("user_status")
      .select("user_id, is_online")
      .in("user_id", allUserIds);

    const statusMap = new Map(statuses?.map((s) => [s.user_id, s.is_online]) || []);

    // Build conversation objects
    const result: Conversation[] = convs.map((conv) => {
      const members = (allMembers || [])
        .filter((m) => m.conversation_id === conv.id)
        .map((m) => {
          const profile = profileMap.get(m.user_id);
          return {
            user_id: m.user_id,
            nickname: m.nickname,
            role: m.role,
            display_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null,
            is_muted: m.is_muted,
            is_pinned: m.is_pinned,
            verified: profile?.is_verified || false,
          };
        });

      const otherMembers = members.filter((m) => m.user_id !== user.id);
      const lastMsg = lastMessages[conv.id];
      const lastMsgSenderProfile = lastMsg ? profileMap.get(lastMsg.sender_id) : null;

      let displayName = conv.name || "Group Chat";
      let displayAvatar = "";
      let isOnline = false;
      let displayVerified = false;

      if (conv.type === "direct" && otherMembers.length > 0) {
        const other = otherMembers[0];
        displayName = other.nickname || other.display_name || "Unknown";
        displayAvatar = (other.display_name || "?").slice(0, 2).toUpperCase();
        isOnline = statusMap.get(other.user_id) || false;
        displayVerified = other.verified || false;
      } else {
        displayAvatar = (displayName || "G").slice(0, 2).toUpperCase();
      }

      let lastMessageText = "";
      if (lastMsg) {
        const senderName = lastMsg.sender_id === user.id ? "You" : (lastMsgSenderProfile?.display_name || "Someone");
        if (lastMsg.type === "text") {
          lastMessageText = conv.type === "group" ? `${senderName}: ${lastMsg.content}` : lastMsg.content || "";
        } else if (lastMsg.type === "image") {
          lastMessageText = `${senderName} sent a photo`;
        } else if (lastMsg.type === "file") {
          lastMessageText = `${senderName} sent a file`;
        } else if (lastMsg.type === "gif") {
          lastMessageText = `${senderName} sent a GIF`;
        } else if (lastMsg.type === "voice") {
          lastMessageText = `${senderName} sent a voice message`;
        }
      }

      // Simple unread count - count messages after last read
      let unreadCount = 0; // TODO: proper unread counting

      return {
        ...conv,
        type: conv.type as "direct" | "group",
        display_name: displayName,
        display_avatar: displayAvatar,
        display_verified: displayVerified,
        last_message: lastMessageText,
        last_message_time: lastMsg?.created_at,
        last_message_sender: lastMsg?.sender_id,
        unread_count: unreadCount,
        is_online: isOnline,
        members,
      };
    });

    // Sort: pinned first, then by last message time
    result.sort((a, b) => {
      const aPin = memberships.find((m) => m.conversation_id === a.id)?.is_pinned || false;
      const bPin = memberships.find((m) => m.conversation_id === b.id)?.is_pinned || false;
      if (aPin !== bPin) return aPin ? -1 : 1;
      const aTime = a.last_message_time || a.created_at;
      const bTime = b.last_message_time || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setConversations(result);
    setLoading(false);
    return result;
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createDirectConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke("create-conversation", {
        body: { type: "direct", otherUserId },
      });

      if (error || !data?.conversationId) {
        console.error("Failed to create conversation:", error, data);
        return null;
      }

      await fetchConversations();
      return data.conversationId;
    } catch (err) {
      console.error("Error creating conversation:", err);
      return null;
    }
  };

  const createGroupConversation = async (name: string, memberIds: string[]): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke("create-conversation", {
        body: { type: "group", name, memberIds },
      });

      if (error || !data?.conversationId) {
        console.error("Failed to create group:", error, data);
        return null;
      }

      await fetchConversations();
      return data.conversationId;
    } catch (err) {
      console.error("Error creating group:", err);
      return null;
    }
  };

  return {
    conversations,
    loading,
    refetch: fetchConversations,
    createDirectConversation,
    createGroupConversation,
  };
}
