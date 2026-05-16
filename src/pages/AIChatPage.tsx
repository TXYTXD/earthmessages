import { useState, useRef, useEffect } from "react";
import { Bot, Send, Trash2, ArrowLeft, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { AITypingEffect, AIThinkingIndicator } from "@/components/chat/AITypingEffect";

type Msg = { role: "user" | "assistant"; content: string };

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

export default function AIChatPage({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

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
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => setLoading(false),
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
    <div className="flex-1 flex flex-col bg-background h-full">
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
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold leading-tight flex items-center gap-1">
            AI Assistant
            <BadgeCheck className="w-4 h-4 text-primary" />
          </h3>
          <span className="text-[11px] text-muted-foreground">Powered by AI · Always available</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-muted-foreground"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

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
                  <AITypingEffect
                    content={msg.content}
                    isStreaming={loading && i === messages.length - 1}
                  />
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
