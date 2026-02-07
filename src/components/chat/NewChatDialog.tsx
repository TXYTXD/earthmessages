import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (userId: string) => void;
}

export function NewChatDialog({ open, onClose, onSelect }: NewChatDialogProps) {
  const { friends } = useFriends();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Message</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No friends yet. Add friends first!</p>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.user_id}
                    onClick={() => { onSelect(friend.user_id); onClose(); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                        {(friend.display_name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      {friend.is_online && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
                      )}
                    </div>
                    <div className="text-left">
                      <span className="text-[15px] font-medium block">{friend.display_name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {friend.is_online ? "Active now" : "Offline"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
