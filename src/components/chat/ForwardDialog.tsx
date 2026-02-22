import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Conversation } from "@/hooks/useConversations";
import { type Message } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { encryptMessage, getConversationKey } from "@/lib/encryption";
import { toast } from "@/hooks/use-toast";
import { Search, Forward } from "lucide-react";

interface ForwardDialogProps {
  open: boolean;
  onClose: () => void;
  message: Message | null;
  conversations: Conversation[];
}

export function ForwardDialog({ open, onClose, message, conversations }: ForwardDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const filtered = conversations.filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = async (conv: Conversation) => {
    if (!user || !message) return;
    setSending(conv.id);

    try {
      let content = message.content || "";
      if (message.type === "text" && content) {
        const encKey = await getConversationKey(conv.id);
        content = await encryptMessage(content, encKey);
      }

      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: user.id,
        content,
        type: message.type,
        media_url: message.media_url || null,
        media_metadata: message.media_metadata || null,
      });

      toast({ title: "Forwarded", description: `Message sent to ${conv.display_name}` });
      onClose();
    } catch {
      toast({ title: "Error", description: "Failed to forward message", variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="w-5 h-5" /> Forward message
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-4 py-2 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* Message preview */}
        {message && (
          <div className="px-3 py-2 bg-accent/50 rounded-lg text-sm text-muted-foreground mb-2 truncate">
            {message.type === "text" ? message.content : `[${message.type}]`}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleForward(conv)}
              disabled={sending === conv.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {conv.display_avatar}
              </div>
              <span className="text-sm font-medium truncate flex-1">{conv.display_name}</span>
              {sending === conv.id && (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">No conversations found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
