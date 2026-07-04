import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AIMsg = { role: "user" | "assistant"; content: string };

export type AIChat = {
  id: string;
  title: string;
  messages: AIMsg[];
  created_at: string;
  updated_at: string;
};

const COLS = "id, title, messages, created_at, updated_at";

function normalize(row: {
  id: string;
  title: string;
  messages: unknown;
  created_at: string;
  updated_at: string;
}): AIChat {
  return {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
    messages: Array.isArray(row.messages) ? (row.messages as AIMsg[]) : [],
  };
}

export function useAIChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<AIChat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("ai_chats")
      .select(COLS)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setChats((data || []).map(normalize));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const createChat = useCallback(async (): Promise<AIChat | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("ai_chats")
      .insert({ user_id: user.id, title: "New chat", messages: [] })
      .select(COLS)
      .single();
    if (error || !data) return null;
    const chat = normalize(data);
    setChats((prev) => [chat, ...prev]);
    return chat;
  }, [user]);

  const saveMessages = useCallback(
    async (chatId: string, messages: AIMsg[], title?: string) => {
      const updated_at = new Date().toISOString();
      setChats((prev) =>
        prev
          .map((c) =>
            c.id === chatId
              ? { ...c, messages, updated_at, title: title ?? c.title }
              : c
          )
          .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      );
      const patch: Record<string, unknown> = {
        messages: messages as unknown as never,
        updated_at,
      };
      if (title) patch.title = title;
      await supabase.from("ai_chats").update(patch).eq("id", chatId);
    },
    []
  );

  const renameChat = useCallback(async (chatId: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: clean } : c))
    );
    await supabase.from("ai_chats").update({ title: clean }).eq("id", chatId);
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    await supabase.from("ai_chats").delete().eq("id", chatId);
  }, []);

  return {
    chats,
    loading,
    fetchChats,
    createChat,
    saveMessages,
    renameChat,
    deleteChat,
  };
}
