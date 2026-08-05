import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StoryComment {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
}

// Likes + comments for the story currently open in the viewer.
export function useStoryEngagement(storyId: string | null) {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);

  const refresh = useCallback(async () => {
    if (!storyId || !user) return;
    const [{ data: likes }, { data: rawComments }] = await Promise.all([
      supabase.from("story_likes").select("user_id").eq("story_id", storyId),
      supabase
        .from("story_comments")
        .select("*")
        .eq("story_id", storyId)
        .order("created_at", { ascending: true }),
    ]);
    setLikeCount(likes?.length || 0);
    setLiked(!!likes?.some((l) => l.user_id === user.id));

    const userIds = [...new Set((rawComments || []).map((c) => c.user_id))];
    let nameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name || "Unknown"]) || []);
    }
    setComments(
      (rawComments || []).map((c) => ({ ...c, user_name: nameMap.get(c.user_id) || "Unknown" }))
    );
  }, [storyId, user]);

  useEffect(() => {
    setLikeCount(0);
    setLiked(false);
    setComments([]);
    refresh();
  }, [refresh]);

  const toggleLike = async () => {
    if (!storyId || !user) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      await supabase.from("story_likes").delete().eq("story_id", storyId).eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from("story_likes").insert({ story_id: storyId, user_id: user.id });
    }
  };

  const addComment = async (content: string) => {
    const clean = content.trim();
    if (!storyId || !user || !clean) return;
    await supabase.from("story_comments").insert({ story_id: storyId, user_id: user.id, content: clean });
    await refresh();
  };

  return { likeCount, liked, comments, toggleLike, addComment };
}

// Follow (= friend request) state toward a story's creator.
export function useFollowUser(targetUserId: string | null) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"self" | "friends" | "pending" | "none">("none");

  const check = useCallback(async () => {
    if (!user || !targetUserId) return;
    if (user.id === targetUserId) {
      setStatus("self");
      return;
    }
    const { data } = await supabase
      .from("friend_requests")
      .select("status")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`
      )
      .limit(1)
      .maybeSingle();
    if (!data) setStatus("none");
    else if (data.status === "accepted") setStatus("friends");
    else setStatus("pending");
  }, [user, targetUserId]);

  useEffect(() => {
    setStatus("none");
    check();
  }, [check]);

  const follow = async () => {
    if (!user || !targetUserId || status !== "none") return;
    setStatus("pending");
    await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: targetUserId });
  };

  return { status, follow };
}
