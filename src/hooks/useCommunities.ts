import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Community {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  owner_id: string;
  conversation_id: string;
  member_count: number;
  is_member: boolean;
}

export function useCommunities() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: rows }, { data: counts }, { data: myMemberships }] = await Promise.all([
      (supabase.from("communities") as any)
        .select("id, name, description, emoji, owner_id, conversation_id, created_at")
        .order("created_at", { ascending: false }),
      (supabase.rpc as any)("community_member_counts"),
      supabase.from("conversation_members").select("conversation_id").eq("user_id", user.id),
    ]);

    const countMap = new Map<string, number>(
      (counts || []).map((c: any) => [c.community_id, Number(c.member_count)])
    );
    const myConvs = new Set((myMemberships || []).map((m: any) => m.conversation_id));

    setCommunities(
      (rows || []).map((r: any) => ({
        ...r,
        member_count: countMap.get(r.id) ?? 0,
        is_member: myConvs.has(r.conversation_id),
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createCommunity = useCallback(
    async (name: string, description: string, emoji: string) => {
      if (!user) return null;

      // 1. The backing group conversation
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ type: "group", name: name.trim(), created_by: user.id })
        .select()
        .single();
      if (convErr || !conv) {
        toast.error("Could not create the community");
        return null;
      }

      // 2. Creator joins as admin
      const { error: memErr } = await supabase.from("conversation_members").insert({
        conversation_id: conv.id,
        user_id: user.id,
        role: "admin",
      });
      if (memErr) {
        toast.error("Could not create the community");
        return null;
      }

      // 3. The community record that makes it discoverable
      const { data: community, error: comErr } = await (supabase.from("communities") as any)
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          emoji: emoji || "🌍",
          owner_id: user.id,
          conversation_id: conv.id,
        })
        .select()
        .single();
      if (comErr || !community) {
        toast.error("Could not create the community");
        return null;
      }

      toast.success(`Community "${name.trim()}" created! 🎉`);
      await refresh();
      return community;
    },
    [user, refresh]
  );

  const joinCommunity = useCallback(
    async (community: Community) => {
      if (!user) return false;
      const { error } = await supabase.from("conversation_members").insert({
        conversation_id: community.conversation_id,
        user_id: user.id,
        role: "member",
      });
      if (error && !`${error.message}`.includes("duplicate")) {
        toast.error("Could not join the community");
        return false;
      }
      toast.success(`Welcome to ${community.name}! Tap Open to start chatting.`);
      await refresh();
      return true;
    },
    [user, refresh]
  );

  const leaveCommunity = useCallback(
    async (community: Community) => {
      if (!user) return false;
      if (community.owner_id === user.id) {
        toast.error("You own this community — delete it instead, or keep it running.");
        return false;
      }
      await supabase
        .from("conversation_members")
        .delete()
        .eq("conversation_id", community.conversation_id)
        .eq("user_id", user.id);
      toast.success(`You left ${community.name}.`);
      await refresh();
      return true;
    },
    [user, refresh]
  );

  const deleteCommunity = useCallback(
    async (community: Community) => {
      if (!user || community.owner_id !== user.id) return false;
      // Deleting the conversation cascades to the community record
      await (supabase.from("communities") as any).delete().eq("id", community.id);
      await supabase.from("conversations").delete().eq("id", community.conversation_id);
      toast.success(`Community "${community.name}" deleted.`);
      await refresh();
      return true;
    },
    [user, refresh]
  );

  return { communities, loading, createCommunity, joinCommunity, leaveCommunity, deleteCommunity, refresh };
}
