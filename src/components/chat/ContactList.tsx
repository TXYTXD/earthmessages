import { useState } from "react";
import { Search, MessageCircle, Users, Bot, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { type Conversation } from "@/hooks/useConversations";
import { formatDistanceToNow } from "date-fns";

interface ContactListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  onSelectAI?: () => void;
  isAISelected?: boolean;
  loading: boolean;
}

export function ContactList({ conversations, selectedId, onSelect, onSelectAI, isAISelected, loading }: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery
    ? conversations.filter((c) =>
        c.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <div className="flex-1 flex flex-col">
      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Messenger"
            className="w-full pl-10 pr-4 py-2 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {/* AI Assistant - Pinned at top */}
        <button
          onClick={onSelectAI}
          className={`w-full p-2.5 flex items-center gap-3 rounded-2xl premium-hover ${
            isAISelected ? "bg-accent shadow-soft" : ""
          }`}
        >
          <div className="relative flex-shrink-0">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-soft"
              style={{ background: "var(--messenger-gradient)" }}
            >
              <Bot className="w-6 h-6" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-semibold tracking-tight">AI Assistant</span>
              <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
            </div>
            <p className="text-[13px] text-muted-foreground truncate">Ask me anything · Always online</p>
          </div>
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-8">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No conversations found" : "No other conversations yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Add friends to start chatting</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full p-2.5 flex items-center gap-3 rounded-2xl premium-hover ${
                selectedId === conv.id ? "bg-accent shadow-soft" : ""
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground ring-1 ring-border/60">
                  {conv.type === "group" ? (
                    <Users className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    conv.display_avatar
                  )}
                </div>
                {conv.is_online && conv.type === "direct" && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[15px] tracking-tight truncate ${conv.unread_count > 0 ? "font-semibold" : "font-medium"}`}>
                    {conv.display_name}
                  </span>
                  {conv.last_message_time && (
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={`text-[13px] truncate ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {conv.last_message || "No messages yet"}
                  </p>
                  {conv.unread_count > 0 && (
                    <div
                      className="min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-soft"
                      style={{ background: "var(--messenger-gradient)" }}
                    >
                      <span className="text-[10px] font-bold">{conv.unread_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
