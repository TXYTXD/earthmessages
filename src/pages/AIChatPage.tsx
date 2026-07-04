import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Trash2,
  ArrowLeft,
  BadgeCheck,
  History,
  Plus,
  Pencil,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { AITypingEffect, AIThinkingIndicator } from "@/components/chat/AITypingEffect";
import { AIMessageContent } from "@/components/chat/AIMessageContent";
import { useAIChats, type AIMsg, type AIChat } from "@/hooks/useAIChats";

type Msg = AIMsg;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (status: number) => void;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) { onError(401); return; }
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok || !resp.body) {
    onError(resp.status);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const c = JSON.parse(json).choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { buf = line + "\n" + buf; break; }
    }
  }
  onDone();
}

function deriveTitle(messages: Msg[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const raw = (firstUser?.content || "New chat").replace(/\[gif:[^\]]*\]/gi, "").trim();
  return raw.length > 40 ? `${raw.slice(0, 40)}…` : raw || "New chat";
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AIChatPage({ onBack }: { onBack?: () => void }) {
  const { chats, createChat, saveMessages, renameChat, deleteChat } = useAIChats();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const initedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On first load, open the most recent saved chat (if any)
  useEffect(() => {
    if (initedRef.current) return;
    if (chats.length > 0) {
      initedRef.current = true;
      setActiveChatId(chats[0].id);
      setMessages(chats[0].messages);
    }
  }, [chats]);

  const openChat = (chat: AIChat) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setShowHistory(false);
  };

  const newChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setShowHistory(false);
    initedRef.current = true;
  };

  const handleRename = async (chat: AIChat) => {
    const next = window.prompt("Rename chat", chat.title);
    if (next != null) await renameChat(chat.id, next);
  };

  const handleDelete = async (chat: AIChat) => {
    if (!window.confirm("Delete this chat? This can't be undone.")) return;
    await deleteChat(chat.id);
    if (chat.id === activeChatId) {
      setActiveChatId(null);
      setMessages([]);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    const base = [...messages, userMsg];
    setMessages(base);
    setLoading(true);

    // Ensure a persisted chat exists to save into
    let chatId = activeChatId;
    if (!chatId) {
      const created = await createChat();
      if (created) {
        chatId = created.id;
        setActiveChatId(created.id);
      }
    }
    const isNewTitle =
      !chats.find((c) => c.id === chatId) ||
      chats.find((c) => c.id === chatId)?.title === "New chat";

    let soFar = "";
    const upsert = (chunk: string) => {
      soFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: soFar } : m));
        }
        return [...prev, { role: "assistant", content: soFar }];
      });
    };

    try {
      await streamChat({
        messages: base,
        onDelta: upsert,
        onDone: () => {
          setLoading(false);
          if (chatId) {
            const final: Msg[] = [...base, { role: "assistant", content: soFar }];
            saveMessages(chatId, final, isNewTitle ? deriveTitle(final) : undefined);
          }
        },
        onError: (status) => {
          setLoading(false);
          if (status === 429) toast({ title: "Rate limited", description: "Please wait a moment and try again.", variant: "destructive" });
          else if (status === 402) toast({ title: "Credits exhausted", description: "Please add AI credits to continue.", variant: "destructive" });
          else toast({ title: "Error", description: "AI is unavailable right now.", variant: "destructive" });
        },
      });
    } catch {
      setLoading(false);
      toast({ title: "Network error", description: "Could not reach AI service.", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background h-full relative">
      {/* Header */}
      <div className="h-14 px-4 flex items-center gap-2 border-b border-border shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold leading-tight flex items-center gap-1">
            AI Assistant
            <BadgeCheck className="w-4 h-4 text-primary" />
          </h3>
          <span className="text-[11px] text-muted-foreground">Powered by AI · Always available</span>
        </div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-muted-foreground"
          title="Previous chats"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          onClick={newChat}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-muted-foreground"
          title="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-black/20"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="absolute top-0 right-0 z-20 h-full w-[300px] max-w-[85%] bg-background border-l border-border flex flex-col shadow-xl"
            >
              <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
                <span className="font-semibold">Previous chats</span>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {chats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center px-4 py-8">
                    No previous chats yet.
                  </p>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                        chat.id === activeChatId ? "bg-accent" : ""
                      }`}
                      onClick={() => openChat(chat)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{chat.title}</p>
                        <p className="text-[11px] text-muted-foreground">{relativeTime(chat.updated_at)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRename(chat); }}
                        className="w-7 h-7 rounded-full hover:bg-background flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Rename"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(chat); }}
                        className="w-7 h-7 rounded-full hover:bg-background flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-border shrink-0">
                <button
                  onClick={newChat}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" /> New chat
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Chat with AI</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Ask me anything — I can help with questions, ideas, writing, and more! 🤖
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {["What can you do?", "Tell me a joke", "Help me write a message"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-3 py-1.5 rounded-full bg-accent text-sm text-foreground hover:bg-accent/80 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center mr-1.5 mt-auto mb-1 flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-[15px] leading-relaxed ${
                  msg.role === "user"
                    ? "messenger-bubble-sent rounded-br-sm"
                    : "messenger-bubble-received rounded-bl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  loading && i === messages.length - 1 ? (
                    <AITypingEffect content={msg.content} isStreaming />
                  ) : (
                    <AIMessageContent content={msg.content} />
                  )
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <AIThinkingIndicator />
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message AI..."
            className="flex-1 px-4 py-2.5 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
