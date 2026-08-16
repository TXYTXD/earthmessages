import { useState, useRef } from "react";
import { Send, Smile, Image, Paperclip, Mic, ThumbsUp, X, Sticker, Clock, CalendarClock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { type Message } from "@/hooks/useMessages";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { StickerPicker } from "./StickerPicker";
import { GifPicker } from "./GifPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Simple GIF icon as inline SVG component
function GifIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">GIF</text>
    </svg>
  );
}

interface ChatInputProps {
  onSend: (content: string, type?: string, mediaUrl?: string, metadata?: any, replyToId?: string) => void;
  onTyping: () => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSchedule?: (content: string, scheduledAt: Date, type?: string, mediaUrl?: string, metadata?: any, replyToId?: string) => void;
}

export function ChatInput({ onSend, onTyping, replyTo, onCancelReply, onSchedule }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading } = useMediaUpload();
  const { recording, seconds, start: startRecording, stop: stopRecording, cancel: cancelRecording } = useVoiceRecorder();

  const handleStartRecording = async () => {
    closeAllPickers();
    setShowSchedule(false);
    await startRecording();
  };

  const handleSendVoice = async () => {
    const duration = seconds;
    const file = await stopRecording();
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      onSend("🎤 Voice message", "voice", result.url, { ...result.metadata, duration }, replyTo?.id);
      onCancelReply();
    }
  };

  const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSend = () => {
    if (!message.trim() && !replyTo) return;
    if (message.trim()) {
      onSend(message.trim(), "text", undefined, undefined, replyTo?.id);
      setMessage("");
      onCancelReply();
      setShowEmoji(false);
    }
  };

  const handleScheduleSend = () => {
    if (!message.trim() || !scheduleDate || !onSchedule) return;

    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledAt = new Date(scheduleDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    if (scheduledAt <= new Date()) {
      return; // Can't schedule in the past
    }

    onSchedule(message.trim(), scheduledAt, "text", undefined, undefined, replyTo?.id);
    setMessage("");
    setScheduleDate(undefined);
    setScheduleTime("12:00");
    setShowSchedule(false);
    onCancelReply();
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

  const handleStickerSelect = (sticker: string) => {
    onSend(sticker, "sticker", undefined, undefined, replyTo?.id);
    onCancelReply();
    setShowStickers(false);
  };

  const handleGifSelect = (gifUrl: string) => {
    onSend("GIF", "gif", gifUrl, undefined, replyTo?.id);
    onCancelReply();
    setShowGifs(false);
  };

  const closeAllPickers = () => {
    setShowEmoji(false);
    setShowStickers(false);
    setShowGifs(false);
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

      {/* Sticker Picker */}
      <AnimatePresence>
        {showStickers && (
          <StickerPicker
            onSelect={handleStickerSelect}
            onClose={() => setShowStickers(false)}
          />
        )}
      </AnimatePresence>

      {/* GIF Picker */}
      <AnimatePresence>
        {showGifs && (
          <GifPicker
            onSelect={handleGifSelect}
            onClose={() => setShowGifs(false)}
          />
        )}
      </AnimatePresence>

      {/* Schedule Picker */}
      <AnimatePresence>
        {showSchedule && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-popover border border-border rounded-xl shadow-lg p-3 z-50"
          >
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Schedule Message</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">Beta</Badge>
              <button onClick={() => setShowSchedule(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Calendar
              mode="single"
              selected={scheduleDate}
              onSelect={setScheduleDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className={cn("p-2 pointer-events-auto rounded-lg border border-border")}
            />
            <div className="flex items-center gap-2 mt-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="flex-1 h-9 text-sm"
              />
            </div>
            {scheduleDate && (
              <div className="mt-2 text-[12px] text-muted-foreground">
                Sending on {format(scheduleDate, "MMM d, yyyy")} at {scheduleTime}
              </div>
            )}
            <Button
              size="sm"
              className="w-full mt-3"
              disabled={!message.trim() || !scheduleDate}
              onClick={handleScheduleSend}
            >
              <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
              Schedule Send
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

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

      {recording ? (
        <div className="flex items-center gap-3 px-2 py-1">
          <span className="w-3 h-3 rounded-full bg-destructive animate-pulse flex-shrink-0" />
          <span className="text-[15px] font-medium text-foreground tabular-nums">{formatSeconds(seconds)}</span>
          <span className="text-sm text-muted-foreground flex-1">Recording…</span>
          <button
            onClick={cancelRecording}
            className="px-3 py-1.5 rounded-full hover:bg-accent transition-colors text-sm text-muted-foreground flex-shrink-0"
          >
            Cancel
          </button>
          <button
            onClick={handleSendVoice}
            disabled={uploading}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
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
          onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); setShowGifs(false); setShowSchedule(false); }}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
        >
          <Smile className="w-5 h-5" />
        </button>
        <button
          onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); setShowGifs(false); setShowSchedule(false); }}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
        >
          <Sticker className="w-5 h-5" />
        </button>
        <button
          onClick={() => { setShowGifs(!showGifs); setShowEmoji(false); setShowStickers(false); setShowSchedule(false); }}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
        >
          <GifIcon className="w-5 h-5" />
        </button>
        {onSchedule && (
          <button
            onClick={() => { setShowSchedule(!showSchedule); setShowEmoji(false); setShowStickers(false); setShowGifs(false); }}
            className={cn(
              "w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center flex-shrink-0",
              showSchedule ? "text-primary bg-accent" : "text-primary"
            )}
          >
            <CalendarClock className="w-5 h-5" />
          </button>
        )}

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
          <>
            <button
              onClick={handleStartRecording}
              disabled={uploading}
              className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
              title="Record a voice message"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleThumbsUp}
              className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0"
            >
              <ThumbsUp className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      )}
    </div>
  );
}
