import { useState } from "react";
import { useElementStyle } from "@/hooks/useElementStyle";
import { useT } from "@/contexts/LanguageContext";
import { Search, UsersRound, Sparkles, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { springy, snappy, riseIn, stagger } from "@/lib/motion";
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
  const t = useT();
  const elRow = useElementStyle("list.row");
  const elUnread = useElementStyle("list.unread");
  const elOnline = useElementStyle("list.online");
  const elAvatar = useElementStyle("avatar.ring");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery
    ? conversations.filter((c) =>
        c.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <div className="flex-1 flex flex-col">
      {/* Search */}
      <div className="px-3 py-1.5">
        <motion.div
          className="relative"
          whileFocus={{ scale: 1.01 }}
          transition={snappy}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("chats.search")}
            className="w-full h-10 pl-11 pr-4 glass-inset rounded-full text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </motion.div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {/* AI Assistant - Pinned at top */}
        <button
          onClick={onSelectAI}
          className={`w-full p-2.5 flex items-center gap-3 rounded-[20px] press-soft ${
            isAISelected ? "bg-primary/12 ring-1 ring-primary/20" : "hover:bg-accent/50"
          }`}
        >
          <div className="relative flex-shrink-0">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground shadow-soft"
              style={{ background: "hsl(var(--primary))" }}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-card online-ping" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-semibold tracking-tight">AI Assistant</span>
              <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
            </div>
            <p className="text-[13px] text-muted-foreground truncate">{t("presence.alwaysOnline")}</p>
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
          <motion.div variants={stagger(0.016)} initial="hidden" animate="show" className="space-y-0.5">
          {filtered.map((conv) => (
            <motion.button
              key={conv.id}
              variants={riseIn}
              onClick={() => { elRow.play(); onSelect(conv); }}
              className={`w-full p-2.5 flex items-center gap-3 rounded-[20px] press-soft ${elRow.className} ${
                selectedId === conv.id ? "bg-primary/12 ring-1 ring-primary/20" : "hover:bg-accent/50"
              }`}
              style={selectedId === conv.id ? undefined : elRow.style}
            >
              <div className="relative flex-shrink-0">
                <div
                  className={`w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-[15px] font-semibold text-foreground ring-1 ring-border/60 ${elAvatar.className}`}
                  style={elAvatar.style}
                >
                  {conv.type === "group" ? (
                    <UsersRound className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    conv.display_avatar
                  )}
                </div>
                {conv.is_online && conv.type === "direct" && (
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-card online-ping ${elOnline.className}`}
                    style={elOnline.overrides?.color ? { background: elOnline.overrides.color } : undefined}
                  />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[16px] tracking-tight truncate flex items-center gap-1 ${conv.unread_count > 0 ? "font-bold" : "font-semibold"}`}>
                    <span className="truncate">{conv.display_name}</span>
                    {conv.display_verified && (
                      <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </span>
                  {conv.last_message_time && (
                    <span className="text-[12px] text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={`text-[14px] truncate ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {conv.last_message || t("chats.noMessages")}
                  </p>
                  {conv.unread_count > 0 && (
                    <motion.div
                      key={conv.unread_count}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={springy}
                      className={`min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground shadow-soft ${elUnread.className}`}
                      style={{ background: elUnread.overrides?.background ?? "hsl(var(--primary))", ...(elUnread.overrides?.color ? { color: elUnread.overrides.color } : {}) }}
                    >
                      <span className="text-[12px] font-bold">{conv.unread_count}</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
