import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  visibility: "private" | "public";
  user_name: string;
  user_avatar: string;
  viewed: boolean;
}

export interface StoryGroup {
  user_id: string;
  user_name: string;
  user_avatar: string;
  stories: Story[];
  all_viewed: boolean;
}

export function useStories() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    if (!user) return;

    const { data: stories } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (!stories || stories.length === 0) {
      setStoryGroups([]);
      setMyStories([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(stories.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const { data: views } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", user.id);

    const viewedIds = new Set(views?.map((v) => v.story_id) || []);

    // Generate signed URLs for story media
    const signedUrls = new Map<string, string>();
    for (const s of stories) {
      // If media_url is a path (not a full URL), generate signed URL
      if (!s.media_url.startsWith("http")) {
        const { data } = await supabase.storage.from("stories").createSignedUrl(s.media_url, 60 * 60 * 24);
        if (data) signedUrls.set(s.id, data.signedUrl);
      }
    }

    const enriched: Story[] = stories.map((s) => {
      const profile = profileMap.get(s.user_id);
      return {
        ...s,
        visibility: (s.visibility === "public" ? "public" : "private") as "private" | "public",
        media_url: signedUrls.get(s.id) || s.media_url,
        user_name: profile?.display_name || "Unknown",
        user_avatar: (profile?.display_name || "?").slice(0, 2).toUpperCase(),
        viewed: viewedIds.has(s.id),
      };
    });

    setMyStories(enriched.filter((s) => s.user_id === user.id));

    const grouped = new Map<string, StoryGroup>();
    enriched
      .filter((s) => s.user_id !== user.id)
      .forEach((s) => {
        const existing = grouped.get(s.user_id) || {
          user_id: s.user_id,
          user_name: s.user_name,
          user_avatar: s.user_avatar,
          stories: [],
          all_viewed: true,
        };
        existing.stories.push(s);
        if (!s.viewed) existing.all_viewed = false;
        grouped.set(s.user_id, existing);
      });

    // Sort: unviewed first
    const groups = [...grouped.values()].sort((a, b) => {
      if (a.all_viewed !== b.all_viewed) return a.all_viewed ? 1 : -1;
      return 0;
    });

    setStoryGroups(groups);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const createStory = async (file: File, caption?: string, visibility: "private" | "public" = "private") => {
    if (!user) return;

    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("stories")
      .upload(filePath, file);

    if (uploadError) return;

    // Store the file path as media_url (we'll generate signed URLs when fetching)
    await supabase.from("stories").insert({
      user_id: user.id,
      media_url: filePath,
      media_type: file.type.startsWith("video") ? "video" : "image",
      caption: caption || null,
      visibility,
    });

    await fetchStories();
  };

  const viewStory = async (storyId: string) => {
    if (!user) return;
    await supabase.from("story_views").upsert(
      { story_id: storyId, viewer_id: user.id, viewed_at: new Date().toISOString() },
      { onConflict: "story_id,viewer_id" }
    );
  };

  const deleteStory = async (storyId: string) => {
    if (!user) return;
    await supabase.from("stories").delete().eq("id", storyId).eq("user_id", user.id);
    await fetchStories();
  };

  return { storyGroups, myStories, loading, createStory, viewStory, deleteStory, refetch: fetchStories };
}
