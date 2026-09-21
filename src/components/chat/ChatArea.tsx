import { useRef, useEffect, useState } from "react";
import { useT } from "@/contexts/LanguageContext";
import { Phone, Video, Info, Search as SearchIcon, ArrowLeft, Lock, BadgeCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { springy, snappy, bubbleIn } from "@/lib/motion";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ForwardDialog } from "./ForwardDialog";
import { useMessages, type Message } from "@/hooks/useMessages";
import { useStarredMessages } from "@/hooks/useStarredMessages";
import { useScheduledMessages } from "@/hooks/useScheduledMessages";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { UserSafetyDialog } from "./UserSafetyDialog";
import { type Conversation } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";

interface ChatAreaProps {
  conversation: Conversation;
  conversations: Conversation[];
  onBack?: () => void;
  /** On a wide screen the conversation is a panel floating on the background */
  panel?: boolean;
}

// "Today", "Yesterday", or the date — so a thread reads as days rather than
// one endless column.
function dayLabel(iso: string, t: (k: "chats.today" | "chats.yesterday") => string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (days === 0) return t("chats.today");
  if (days === 1) return t("chats.yesterday");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: days > 300 ? "numeric" : undefined });
}

export function ChatArea({ conversation, conversations, onBack, panel }: ChatAreaProps) {
  const { user } = useAuth();
  const { startCall } = useCall();
  const t = useT();
  const {
    messages,
    loading,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    setTyping,
    hasOlder,
    loadingOlder,
    loadOlderMessages,
    clearChat,
  } = useMessages(conversation.id);

  const { scheduleMessage } = useScheduledMessages(conversation.id);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const { blockedIds, blockUser, unblockUser, reportUser } = useBlockedUsers();
  const otherMember = conversation.type === "direct"
    ? conversation.members.find((m) => m.user_id !== user?.id)
    : undefined;
  const { starredIds, toggleStar } = useStarredMessages(conversation.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Hide messages from blocked users, then apply search
  const visibleMessages = messages.filter((m) => !blockedIds.has(m.sender_id));
  const filteredMessages = searchQuery
    ? visibleMessages.filter((m) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : visibleMessages;

  const isGroup = conversation.type === "group";

  return (
    <div
      className={`flex-1 flex flex-col relative overflow-hidden ${
        panel ? "rounded-[28px] glass-tint glass-float" : ""
      }`}
    >
      {/* The header floats above the messages, which slide underneath it */}
      <motion.div
        initial={{ y: -22, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springy}
        className="absolute left-3 right-3 top-3 z-20 rounded-[26px] glass-tint glass-float px-2 py-2 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full press flex items-center justify-center text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
              {conversation.display_avatar}
            </div>
            {conversation.is_online && conversation.type === "direct" && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card online-ping" />
            )}
          </div>
          <div>
            <h3 className="text-[15px] font-semibold leading-tight flex items-center gap-1">
              {conversation.display_name}
              {conversation.display_verified && (
                <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </h3>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              {conversation.type === "direct"
                ? `${t("presence.encrypted")} · ${conversation.is_online ? t("presence.activeNow") : t("presence.offline")}`
                : `${t("presence.encrypted")} · ${t("presence.members", { count: String(conversation.members.length) })}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-10 h-10 rounded-full press flex items-center justify-center text-primary"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
          {conversation.type === "direct" && (
            <>
              <button
                onClick={() => {
                  const other = conversation.members.find((m) => m.user_id !== user?.id);
                  console.log("[ChatArea] Voice call clicked, other member:", other);
                  if (other) startCall(other.user_id, "voice");
                }}
                className="w-10 h-10 rounded-full press flex items-center justify-center text-primary"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  const other = conversation.members.find((m) => m.user_id !== user?.id);
                  console.log("[ChatArea] Video call clicked, other member:", other);
                  if (other) startCall(other.user_id, "video");
                }}
                className="w-10 h-10 rounded-full press flex items-center justify-center text-primary"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
          {otherMember && (
            <button
              onClick={() => setShowSafety(true)}
              className="w-10 h-10 rounded-full press flex items-center justify-center text-primary"
              title={t("safety.title")}
            >
              <Info className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Search bar */}
      <AnimatePresence>
      {showSearch && (
        <motion.div
          initial={{ opacity: 0, y: -10, scaleY: 0.9 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -10, scaleY: 0.9 }}
          transition={snappy}
          style={{ originY: 0 }}
          className="absolute left-3 right-3 top-[76px] z-20 rounded-[22px] glass-tint glass-float px-3 py-2"
        >
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("chats.searchIn")}
            className="w-full px-4 py-2 glass-inset rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/25"
            autoFocus
          />
        </motion.div>
      )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-[86px] pb-[92px] space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {searchQuery ? t("chats.noneFound") : t("chats.sayHello")}
          </div>
        ) : (
          <>
          {hasOlder && !searchQuery && (
            <div className="flex justify-center pb-2">
              <button
                onClick={loadOlderMessages}
                disabled={loadingOlder}
                className="text-[12px] px-3 py-1.5 rounded-full bg-accent hover:bg-accent/70 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
              >
                {loadingOlder ? t("chats.loading") : t("chats.loadEarlier")}
              </button>
            </div>
          )}
          {filteredMessages.map((msg, i) => {
            const prevMsg = i > 0 ? filteredMessages[i - 1] : null;
            const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
            const label = dayLabel(msg.created_at, t);
            const newDay = !prevMsg || dayLabel(prevMsg.created_at, t) !== label;

            return (
              <motion.div
                key={msg.id}
                variants={bubbleIn(msg.sender_id === user?.id)}
                initial="hidden"
                animate="show"
                transition={{ delay: Math.min(i * 0.018, 0.4) }}
              >
                {newDay && label && (
                  <div className="flex justify-center py-2">
                    <span className="text-[12px] font-semibold text-muted-foreground glass-tint glass-float rounded-full px-3.5 py-1.5">
                      {label}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  onReact={addReaction}
                  onReply={setReplyTo}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  onForward={setForwardMsg}
                  onToggleStar={toggleStar}
                  isStarred={starredIds.has(msg.id)}
                  showAvatar={showAvatar}
                  isGroup={isGroup}
                />
              </motion.div>
            );
          })}
          </>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground px-3 py-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>
              {t(typingUsers.length === 1 ? "chats.typingOne" : "chats.typingMany", { names: typingUsers.join(", ") })}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* The composer floats too, clear of the bottom edge */}
      <motion.div
        initial={{ y: 26, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springy}
        className="absolute left-3 right-3 bottom-3 z-20"
      >
      <ChatInput
        onSend={sendMessage}
        onTyping={setTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSchedule={scheduleMessage}
      />
      </motion.div>

      <ForwardDialog
        open={!!forwardMsg}
        onClose={() => setForwardMsg(null)}
        message={forwardMsg}
        conversations={conversations}
      />

      {otherMember && (
        <UserSafetyDialog
          open={showSafety}
          onClose={() => setShowSafety(false)}
          userName={conversation.display_name}
          isBlocked={blockedIds.has(otherMember.user_id)}
          onBlock={() => blockUser(otherMember.user_id)}
          onUnblock={() => unblockUser(otherMember.user_id)}
          onReport={(reason, details) => reportUser(otherMember.user_id, reason, details)}
          onClearChat={clearChat}
        />
      )}
    </div>
  );
}
