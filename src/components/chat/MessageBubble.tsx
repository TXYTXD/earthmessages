import { useRef, useState, useEffect } from "react";
import { useElementStyle } from "@/hooks/useElementStyle";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Reply, Smile, Pencil, Trash2, Lock, Forward, Star, Share2 } from "lucide-react";
import { type Message } from "@/hooks/useMessages";
import { VoicePlayer } from "./VoicePlayer";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];

interface MessageBubbleProps {
  message: Message;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onForward: (message: Message) => void;
  onToggleStar: (messageId: string) => void;
  isStarred: boolean;
  showAvatar: boolean;
  isGroup: boolean;
}

export function MessageBubble({ message, onReact, onReply, onEdit, onDelete, onForward, onToggleStar, isStarred, showAvatar, isGroup }: MessageBubbleProps) {
  const { user } = useAuth();
  const { autoTranslate, showOriginal, primaryLang, translateText } = useTranslation();
  const isMe = message.sender_id === user?.id;
  const bubble = useElementStyle(isMe ? "bubble.sent" : "bubble.received");

  // A theme can give messages a sound. Only fires for messages that have
  // just arrived, never for history scrolling past.
  const soundPlayed = useRef(false);
  useEffect(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;
    const age = Date.now() - new Date(message.created_at).getTime();
    if (age < 4000) bubble.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isDeleted = !!message.deleted_at;
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || "");
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Auto-translate incoming messages
  useEffect(() => {
    if (!autoTranslate || isMe || isDeleted || !message.content || message.type !== "text") {
      setTranslatedText(null);
      return;
    }

    let cancelled = false;
    setTranslating(true);
    translateText(message.content).then((result) => {
      if (!cancelled) {
        setTranslatedText(result);
        setTranslating(false);
      }
    });
    return () => { cancelled = true; };
  }, [autoTranslate, primaryLang, message.content, message.type, isMe, isDeleted, translateText]);

  if (message.type === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-[11px] text-muted-foreground bg-accent px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const handleEdit = () => {
    if (editText.trim() && editText !== message.content) {
      onEdit(message.id, editText);
    }
    setEditing(false);
  };

  // Group reactions by emoji
  const reactionGroups = message.reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const myReactions = new Set(message.reactions.filter((r) => r.user_id === user?.id).map((r) => r.emoji));

  const displayContent = translatedText || message.content;

  return (
    <div
      className={`flex ${isMe ? "justify-end" : "justify-start"} group relative`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {/* Avatar for others */}
      {!isMe && showAvatar && isGroup && (
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-foreground mr-1.5 mt-auto mb-1 flex-shrink-0">
          {message.sender_avatar}
        </div>
      )}
      {!isMe && !showAvatar && isGroup && <div className="w-7 mr-1.5 flex-shrink-0" />}

      <div className="max-w-[65%] relative">
        {/* Sender name for groups */}
        {!isMe && showAvatar && isGroup && (
          <span className="text-[11px] text-muted-foreground ml-3 mb-0.5 flex items-center gap-1">{message.sender_name}<VerifiedBadge verified={message.sender_verified} className="w-3 h-3 text-primary" /></span>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={`mx-3 mb-0.5 px-3 py-1.5 rounded-lg text-[12px] border-l-2 border-primary/50 ${isMe ? "bg-primary/10" : "bg-accent"}`}>
            <span className="font-medium text-primary text-[11px]">{message.reply_to.sender_name}</span>
            <p className="text-muted-foreground truncate">{message.reply_to.content}</p>
          </div>
        )}

        {/* Bubble */}
        <motion.div
          style={bubble.style}
          whileTap={{ scale: 0.975 }}
          transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.6 }}
          className={`px-3.5 py-2.5 rounded-[20px] text-[15px] leading-relaxed relative ${bubble.className} ${
            message.sending ? "opacity-60" : ""
          } ${message.failed ? "ring-1 ring-destructive" : ""} ${
            isDeleted
              ? "bg-accent/50 text-muted-foreground italic"
              : isMe
                ? "messenger-bubble-sent rounded-br-sm"
                : "messenger-bubble-received rounded-bl-sm"
          }`}
        >
          {isDeleted ? (
            <span className="text-[13px]">Message deleted</span>
          ) : editing ? (
            <div className="flex items-center gap-2">
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setEditing(false); }}
                className="flex-1 bg-transparent outline-none text-[15px]"
                autoFocus
              />
            </div>
          ) : message.type === "image" ? (
            <img src={message.media_url || ""} alt="Shared image" className="rounded-lg max-w-full max-h-64 object-cover" />
          ) : message.type === "sticker" ? (
            <span className="text-5xl leading-none">{message.content}</span>
          ) : message.type === "file" ? (
            <a href={message.media_url || ""} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline">
              📎 {message.media_metadata?.name || "File"}
            </a>
          ) : message.type === "gif" ? (
            <img src={message.media_url || ""} alt="GIF" className="rounded-lg max-w-full max-h-48" loading="lazy" decoding="async" />
          ) : message.type === "voice" ? (
            <VoicePlayer
              src={message.media_url || ""}
              duration={typeof message.media_metadata?.duration === "number" ? message.media_metadata.duration : undefined}
            />
          ) : (
            <div>
              <span>{displayContent}</span>
              {/* Show original text below translation */}
              {translatedText && showOriginal && message.content && (
                <div className="mt-1 pt-1 border-t border-white/20">
                  <span className="text-[12px] opacity-70 italic">{message.content}</span>
                </div>
              )}
              {translating && (
                <span className="text-[10px] opacity-50 ml-1">translating...</span>
              )}
              {translatedText && !translating && (
                <span className="text-[10px] opacity-60 ml-1 inline-flex items-center gap-0.5">
                  <Globe className="w-2.5 h-2.5" />
                  translated
                </span>
              )}
            </div>
          )}

          {message.is_edited && !isDeleted && (
            <span className="text-[10px] opacity-60 ml-1">edited</span>
          )}
          {message.is_encrypted && !isDeleted && (
            <Lock className="w-2.5 h-2.5 inline-block ml-1 opacity-50" />
          )}
        </motion.div>

        {/* Reactions display */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"} px-2`}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <motion.button
                key={emoji}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                onClick={() => onReact(message.id, emoji)}
                className={`text-[12px] px-2 py-0.5 rounded-full border transition-colors ${
                  myReactions.has(emoji) ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent"
                }`}
              >
                {emoji} {count > 1 && count}
              </motion.button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <AnimatePresence>
          {showActions && !isDeleted && !editing && (
            <motion.div
              ref={actionsRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`absolute top-0 ${isMe ? "right-full mr-1" : "left-full ml-1"} flex items-center gap-0.5 glass rounded-xl shadow-premium p-0.5 z-10`}
            >
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onReply(message)}
                className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onForward(message)}
                className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground"
              >
                <Forward className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const text = message.content || (message.media_url ? message.media_url : "");
                  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center text-green-500"
                title="Share to WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onToggleStar(message.id)}
                className={`w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center ${isStarred ? "text-yellow-500" : "text-muted-foreground"}`}
              >
                <Star className={`w-3.5 h-3.5 ${isStarred ? "fill-yellow-500" : ""}`} />
              </button>
              {isMe && (
                <>
                  {message.type === "text" && (
                    <button
                      onClick={() => { setEditing(true); setShowActions(false); }}
                      className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(message.id)}
                    className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick reactions picker */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.7 }}
              className={`absolute bottom-full mb-1 ${isMe ? "right-0" : "left-0"} flex gap-0.5 glass-tint glass-float rounded-full px-1.5 py-1 z-20`}
            >
              {QUICK_REACTIONS.map((emoji, i) => (
                <motion.button
                  key={emoji}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22, delay: i * 0.028 }}
                  whileHover={{ scale: 1.3, y: -3 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => { onReact(message.id, emoji); setShowReactions(false); }}
                  className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center text-lg"
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
