import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type NewsCategory = "update" | "fun" | "tip" | "safety";
export const NEWS_CATEGORIES: NewsCategory[] = ["update", "fun", "tip", "safety"];

/** The reactions a reader can leave. Fixed, and fixed on the server too. */
export const NEWS_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮"] as const;
export type NewsReaction = (typeof NEWS_REACTIONS)[number];

/** Covers a publisher can pick from. Big, cheerful, and nothing a parent would mind. */
export const NEWS_EMOJIS = [
  "📣", "🎉", "💡", "🛡️", "🚀", "✨", "🎨", "🎮", "🎵", "📸",
  "🌟", "🐣", "🦄", "🍕", "⚽", "🧩", "📚", "🎁", "🌈", "🤖",
];

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  category: NewsCategory;
  emoji: string;
  author_id: string | null;
  kids_ok: boolean;
  created_at: string;
  updated_at: string;
  /** How many of each reaction, and which ones are mine */
  reactions: Record<string, number>;
  mine: Set<string>;
  author_name: string | null;
}

export interface NewsDraft {
  title: string;
  content: string;
  category: NewsCategory;
  emoji: string;
  kids_ok: boolean;
}

const LAST_SEEN_KEY = "ums-news-last-seen";

/** When this person last opened the News page (0 if never). */
export function readNewsLastSeen(): number {
  try {
    const v = Number(localStorage.getItem(LAST_SEEN_KEY));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

/** Marks every post published so far as read. */
export function markNewsSeen() {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
  } catch {
    /* private browsing */
  }
}

export function useNews() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [canPublish, setCanPublish] = useState(false);

  const refetch = useCallback(async () => {
    const [{ data: rows, error }, { data: reacts }] = await Promise.all([
      supabase.from("news_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("news_reactions").select("post_id, user_id, emoji"),
    ]);
    if (error) {
      console.error("[News] could not load:", error);
      setLoading(false);
      return;
    }

    const authorIds = [...new Set((rows ?? []).map((r) => r.author_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (authorIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", authorIds);
      for (const p of profiles ?? []) names.set(p.user_id, p.display_name || "");
    }

    const byPost = new Map<string, { counts: Record<string, number>; mine: Set<string> }>();
    for (const r of reacts ?? []) {
      const slot = byPost.get(r.post_id) ?? { counts: {}, mine: new Set<string>() };
      slot.counts[r.emoji] = (slot.counts[r.emoji] ?? 0) + 1;
      if (r.user_id === user?.id) slot.mine.add(r.emoji);
      byPost.set(r.post_id, slot);
    }

    setPosts(
      (rows ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        category: (NEWS_CATEGORIES.includes(r.category as NewsCategory) ? r.category : "update") as NewsCategory,
        emoji: r.emoji || "📣",
        author_id: r.author_id ?? null,
        // Older rows, or a database the migration has not reached yet, have
        // none of the new columns. They are grown-up-and-kid friendly updates.
        kids_ok: r.kids_ok ?? true,
        created_at: r.created_at,
        updated_at: r.updated_at ?? r.created_at,
        reactions: byPost.get(r.id)?.counts ?? {},
        mine: byPost.get(r.id)?.mine ?? new Set(),
        author_name: r.author_id ? (names.get(r.author_id) ?? null) : null,
      }))
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Only verified accounts see the "Write news" button at all.
  useEffect(() => {
    if (!user) {
      setCanPublish(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_verified")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setCanPublish(!!data?.is_verified);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /** Posts newer than the last visit, for a dot on the menu. */
  const unseenCount = useMemo(() => {
    const seen = readNewsLastSeen();
    return posts.filter((p) => new Date(p.created_at).getTime() > seen).length;
  }, [posts]);

  const toggleReaction = useCallback(
    async (postId: string, emoji: NewsReaction): Promise<"ok" | "signin"> => {
      if (!user) return "signin";
      const post = posts.find((p) => p.id === postId);
      const had = post?.mine.has(emoji) ?? false;

      // Answer the tap straight away; the server catches up.
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const mine = new Set(p.mine);
          const reactions = { ...p.reactions };
          if (had) {
            mine.delete(emoji);
            reactions[emoji] = Math.max(0, (reactions[emoji] ?? 1) - 1);
          } else {
            mine.add(emoji);
            reactions[emoji] = (reactions[emoji] ?? 0) + 1;
          }
          return { ...p, mine, reactions };
        })
      );

      const { error } = had
        ? await supabase.from("news_reactions").delete().eq("post_id", postId).eq("user_id", user.id).eq("emoji", emoji)
        : await supabase.from("news_reactions").insert({ post_id: postId, user_id: user.id, emoji });
      if (error) {
        console.error("[News] reaction failed:", error);
        void refetch();
      }
      return "ok";
    },
    [user, posts, refetch]
  );

  const publish = useCallback(
    async (draft: NewsDraft): Promise<boolean> => {
      if (!user) return false;
      const { error } = await supabase.from("news_posts").insert({
        title: draft.title.trim(),
        content: draft.content.trim(),
        category: draft.category,
        emoji: draft.emoji,
        kids_ok: draft.kids_ok,
        author_id: user.id,
      });
      if (error) {
        toast({ title: "Could not publish", description: error.message, variant: "destructive" });
        return false;
      }
      await refetch();
      return true;
    },
    [user, refetch]
  );

  const update = useCallback(
    async (id: string, draft: NewsDraft): Promise<boolean> => {
      const { error } = await supabase
        .from("news_posts")
        .update({
          title: draft.title.trim(),
          content: draft.content.trim(),
          category: draft.category,
          emoji: draft.emoji,
          kids_ok: draft.kids_ok,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) {
        toast({ title: "Could not save", description: error.message, variant: "destructive" });
        return false;
      }
      await refetch();
      return true;
    },
    [refetch]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from("news_posts").delete().eq("id", id);
      if (error) {
        toast({ title: "Could not delete", description: error.message, variant: "destructive" });
        return false;
      }
      setPosts((prev) => prev.filter((p) => p.id !== id));
      return true;
    },
    []
  );

  return { posts, loading, canPublish, unseenCount, refetch, toggleReaction, publish, update, remove };
}

/**
 * Just the dot: is there news this person has not seen? Light enough to
 * sit in the menu without pulling the whole page's data.
 */
export function useNewsUnread(): boolean {
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("news_posts")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      setUnread(new Date(data.created_at).getTime() > readNewsLastSeen());
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return unread;
}
