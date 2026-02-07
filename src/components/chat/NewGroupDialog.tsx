import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, X } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";

interface NewGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
}

export function NewGroupDialog({ open, onClose, onCreate }: NewGroupDialogProps) {
  const { friends } = useFriends();
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCreate = () => {
    if (!name.trim() || selectedIds.size === 0) return;
    onCreate(name.trim(), [...selectedIds]);
    setName("");
    setSelectedIds(new Set());
    onClose();
  };

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
              <h2 className="text-lg font-semibold">New Group Chat</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name"
                className="w-full px-4 py-2.5 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />

              <div className="space-y-1 max-h-60 overflow-y-auto">
                <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide px-1">
                  Select friends ({selectedIds.size} selected)
                </span>
                {friends.map((friend) => (
                  <button
                    key={friend.user_id}
                    onClick={() => toggle(friend.user_id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      selectedIds.has(friend.user_id) ? "bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                      {(friend.display_name || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="flex-1 text-left text-[15px]">{friend.display_name}</span>
                    {selectedIds.has(friend.user_id) && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
                {friends.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No friends yet. Add friends first!</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-full hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || selectedIds.size === 0}
                className="px-4 py-2 text-sm rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Create Group
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
