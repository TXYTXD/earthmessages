import { useRef, useEffect, useState } from "react";
import { Phone, Video, Info, Search as SearchIcon, ArrowLeft, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useMessages, type Message } from "@/hooks/useMessages";
import { type Conversation } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";

interface ChatAreaProps {
  conversation: Conversation;
  onBack?: () => void;
}

export function ChatArea({ conversation, onBack }: ChatAreaProps) {
  const { user } = useAuth();
  const { startCall } = useCall();
  const {
    messages,
    loading,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    setTyping,
  } = useMessages(conversation.id);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredMessages = searchQuery
    ? messages.filter((m) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const isGroup = conversation.type === "group";

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
              {conversation.display_avatar}
            </div>
            {conversation.is_online && conversation.type === "direct" && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <h3 className="text-[15px] font-semibold leading-tight">{conversation.display_name}</h3>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              {conversation.type === "direct"
                ? conversation.is_online ? "Encrypted · Active now" : "Encrypted · Offline"
                : `Encrypted · ${conversation.members.length} members`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary"
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
                className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  const other = conversation.members.find((m) => m.user_id !== user?.id);
                  console.log("[ChatArea] Video call clicked, other member:", other);
                  if (other) startCall(other.user_id, "video");
                }}
                className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
          <button className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-border">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="w-full px-4 py-2 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {searchQuery ? "No messages found" : "No messages yet. Say hello! 👋"}
          </div>
        ) : (
          filteredMessages.map((msg, i) => {
            const prevMsg = i > 0 ? filteredMessages[i - 1] : null;
            const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
              >
                <MessageBubble
                  message={msg}
                  onReact={addReaction}
                  onReply={setReplyTo}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  showAvatar={showAvatar}
                  isGroup={isGroup}
                />
              </motion.div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground px-3 py-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onTyping={setTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
