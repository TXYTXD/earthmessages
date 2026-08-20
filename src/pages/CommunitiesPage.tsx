import { useState } from "react";
import { motion } from "framer-motion";
import { Globe2, Plus, Search, Users, LogOut, Trash2, MessageCircle, Crown, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCommunities, type Community } from "@/hooks/useCommunities";
import { useAuth } from "@/contexts/AuthContext";
import { CommunityChat } from "@/components/chat/CommunityChat";
import { ManageCommunityDialog } from "@/components/chat/ManageCommunityDialog";

const EMOJI_CHOICES = ["🌍", "🎮", "⚽", "🎵", "🎬", "📚", "💻", "🍕", "🐾", "✈️", "🏋️", "🎨"];

export default function CommunitiesPage() {
  const { user } = useAuth();
  const { communities, loading, createCommunity, joinCommunity, leaveCommunity, deleteCommunity } = useCommunities();
  const [query, setQuery] = useState("");
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [manageCommunity, setManageCommunity] = useState<Community | null>(null);

  // Create dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🌍");
  const [creating, setCreating] = useState(false);

  const filtered = query
    ? communities.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.description || "").toLowerCase().includes(query.toLowerCase())
      )
    : communities;

  const handleCreate = async () => {
    if (name.trim().length < 2) return;
    setCreating(true);
    const created = await createCommunity(name, description, emoji);
    setCreating(false);
    if (created) {
      setShowCreate(false);
      setName("");
      setDescription("");
      setEmoji("🌍");
    }
  };

  // Community chat opens inside this tab, not in Chats
  if (activeCommunity) {
    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <CommunityChat community={activeCommunity} onBack={() => setActiveCommunity(null)} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <Globe2 className="w-6 h-6 text-primary" /> Communities
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Find your people — join or start a community</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-full gap-2">
          <Plus className="w-4 h-4" /> Create
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl w-full mx-auto">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search communities..."
            className="w-full pl-10 pr-4 py-2.5 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <Globe2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {query ? "No communities match your search." : "No communities yet. Be the first to create one! 🚀"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c, i) => (
              <CommunityCard
                key={c.id}
                community={c}
                index={i}
                isOwner={c.owner_id === user?.id}
                onJoin={() => joinCommunity(c)}
                onLeave={() => leaveCommunity(c)}
                onDelete={() => {
                  if (window.confirm(`Delete "${c.name}"? All its messages will be gone forever.`)) {
                    deleteCommunity(c);
                  }
                }}
                onOpen={() => setActiveCommunity(c)}
                onManage={() => setManageCommunity(c)}
              />
            ))}
          </div>
        )}
      </div>

      <ManageCommunityDialog
        open={!!manageCommunity}
        onClose={() => setManageCommunity(null)}
        community={manageCommunity}
      />

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a community</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-colors ${
                    emoji === e ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <Input
              placeholder="Community name (e.g. Football Fans Greece)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
            />
            <Input
              placeholder="What is it about? (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
            <p className="text-[12px] text-muted-foreground">
              Communities are public — anyone on UMS Messages can find and join them.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={name.trim().length < 2 || creating}>
                {creating ? "Creating…" : "Create community"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommunityCard({
  community, index, isOwner, onJoin, onLeave, onDelete, onOpen, onManage,
}: {
  community: Community;
  index: number;
  isOwner: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onManage: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="rounded-2xl border border-border p-4 flex items-start gap-3"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
        {community.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px] flex items-center gap-1.5">
          {community.name}
          {isOwner && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
        </p>
        {community.description && (
          <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2">{community.description}</p>
        )}
        <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {community.member_count} {community.member_count === 1 ? "member" : "members"}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {community.is_member ? (
          <>
            <Button size="sm" variant="outline" className="rounded-full gap-1.5" onClick={onOpen}>
              <MessageCircle className="w-3.5 h-3.5" /> Open
            </Button>
            {isOwner ? (
              <>
                <Button size="sm" variant="outline" className="rounded-full gap-1.5" onClick={onManage}>
                  <Shield className="w-3.5 h-3.5" /> Manage
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full gap-1.5 text-destructive hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" className="rounded-full gap-1.5 text-muted-foreground" onClick={onLeave}>
                <LogOut className="w-3.5 h-3.5" /> Leave
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" className="rounded-full gap-1.5" onClick={onJoin}>
            <Plus className="w-3.5 h-3.5" /> Join
          </Button>
        )}
      </div>
    </motion.div>
  );
}
