import { useState, useEffect } from "react";
import { ChatArea } from "./ChatArea";
import { supabase } from "@/integrations/supabase/client";
import type { Community } from "@/hooks/useCommunities";
import type { Conversation, ConversationMember } from "@/hooks/useConversations";

// Opens a community's chat inside the Communities tab (community
// conversations are excluded from the regular Chats list).
export function CommunityChat({ community, onBack }: { community: Community; onBack: () => void }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: mems } = await supabase
        .from("conversation_members")
        .select("*")
        .eq("conversation_id", community.conversation_id);
      const ids = (mems || []).map((m) => m.user_id);
      const { data: profiles } = ids.length
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, is_verified")
            .in("user_id", ids)
        : { data: [] as any[] };
      const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const members: ConversationMember[] = (mems || []).map((m) => ({
        user_id: m.user_id,
        nickname: m.nickname,
        role: m.role,
        display_name: pmap.get(m.user_id)?.display_name ?? null,
        avatar_url: pmap.get(m.user_id)?.avatar_url ?? null,
        is_muted: m.is_muted,
        is_pinned: m.is_pinned,
        verified: pmap.get(m.user_id)?.is_verified,
      }));

      if (!cancelled) {
        setConversation({
          id: community.conversation_id,
          type: "group",
          name: community.name,
          avatar_url: null,
          theme_color: "#0084ff",
          created_by: community.owner_id,
          created_at: "",
          updated_at: "",
          display_name: `${community.emoji} ${community.name}`,
          display_avatar: community.emoji,
          unread_count: 0,
          is_online: false,
          members,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [community]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <ChatArea conversation={conversation} conversations={[]} onBack={onBack} />;
}
