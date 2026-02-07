import { useState, useRef } from "react";
import { Send, Smile, Image, Paperclip, Mic, ThumbsUp, X } from "lucide-react";
import { type Message } from "@/hooks/useMessages";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface ChatInputProps {
  onSend: (content: string, type?: string, mediaUrl?: string, metadata?: any, replyToId?: string) => void;
  onTyping: () => void;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export function ChatInput({ onSend, onTyping, replyTo, onCancelReply }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading } = useMediaUpload();

  const handleSend = () => {
    if (!message.trim() && !replyTo) return;
    if (message.trim()) {
      onSend(message.trim(), "text", undefined, undefined, replyTo?.id);
      setMessage("");
      onCancelReply();
      setShowEmoji(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (result) {
      onSend(file.name, type, result.url, result.metadata, replyTo?.id);
      onCancelReply();
    }
    e.target.value = "";
  };

  const handleThumbsUp = () => {
    onSend("👍", "text");
  };

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  return (
    <div className="px-3 py-2 border-t border-border relative">
      {/* Emoji Picker */}
      {showEmoji && (
        <div className="absolute bottom-full left-0 mb-2 z-50">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            width={320}
            height={400}
          />
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-accent rounded-lg">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-primary font-medium">Replying to {replyTo.sender_name}</span>
            <p className="text-[12px] text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, "image")}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileUpload(e, "file")}
        />

        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
        >
          <Image className="w-5 h-5" />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
        >
          <Smile className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              onTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder={uploading ? "Uploading..." : "Aa"}
            disabled={uploading}
            className="w-full px-4 py-2 bg-accent rounded-full text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {message.trim() ? (
          <button
            onClick={handleSend}
            className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleThumbsUp}
            className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
          >
            <ThumbsUp className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
