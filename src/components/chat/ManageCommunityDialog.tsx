import { useState, useEffect, useCallback } from "react";
import { Crown, MicOff, Mic, Ban, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Community } from "@/hooks/useCommunities";

interface MemberRow {
  user_id: string;
  display_name: string;
  muted: boolean;
}

interface BannedRow {
  user_id: string;
  display_name: string;
}

// Owner tools for a community: mute/unmute members and ban/unban users.
export function ManageCommunityDialog({
  open,
  onClose,
  community,
}: {
  open: boolean;
  onClose: () => void;
  community: Community | null;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [banned, setBanned] = useState<BannedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!community) return;
    setLoading(true);
    const [{ data: mems }, { data: mod }] = await Promise.all([
      supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", community.conversation_id),
      (supabase.from("community_moderation") as any)
        .select("user_id, action")
        .eq("community_id", community.id),
    ]);
    const mutedSet = new Set((mod || []).filter((m: any) => m.action === "mute").map((m: any) => m.user_id));
    const bannedIds = (mod || []).filter((m: any) => m.action === "ban").map((m: any) => m.user_id);
    const allIds = [...new Set([...(mems || []).map((m) => m.user_id), ...bannedIds])];
    const { data: profiles } = allIds.length
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", allIds)
      : { data: [] as any[] };
    const nameOf = (id: string) =>
      (profiles || []).find((p: any) => p.user_id === id)?.display_name || "Unknown";

    setMembers(
      (mems || []).map((m) => ({ user_id: m.user_id, display_name: nameOf(m.user_id), muted: mutedSet.has(m.user_id) }))
    );
    setBanned(bannedIds.map((id: string) => ({ user_id: id, display_name: nameOf(id) })));
    setLoading(false);
  }, [community]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!community) return null;

  const act = async (userId: string, fn: () => Promise<void>) => {
    setBusy(userId);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const mute = (userId: string, name: string) =>
    act(userId, async () => {
      const { error } = await (supabase.from("community_moderation") as any).insert({
        community_id: community.id,
        user_id: userId,
        action: "mute",
      });
      if (error) toast.error("Could not mute");
      else toast.success(`${name} is muted — they can read but not send.`);
    });

  const unmute = (userId: string, name: string) =>
    act(userId, async () => {
      await (supabase.from("community_moderation") as any)
        .delete()
        .eq("community_id", community.id)
        .eq("user_id", userId)
        .eq("action", "mute");
      toast.success(`${name} can talk again.`);
    });

  const ban = (userId: string, name: string) =>
    act(userId, async () => {
      const { error } = await (supabase.from("community_moderation") as any).insert({
        community_id: community.id,
        user_id: userId,
        action: "ban",
      });
      if (error) {
        toast.error("Could not ban");
        return;
      }
      await supabase
        .from("conversation_members")
        .delete()
        .eq("conversation_id", community.conversation_id)
        .eq("user_id", userId);
      toast.success(`${name} is banned from ${community.name}.`);
    });

  const unban = (userId: string, name: string) =>
    act(userId, async () => {
      await (supabase.from("community_moderation") as any)
        .delete()
        .eq("community_id", community.id)
        .eq("user_id", userId)
        .eq("action", "ban");
      toast.success(`${name} can join again.`);
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {community.emoji} Manage {community.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Members ({members.length})
              </p>
              <div className="space-y-1">
                {members.map((m) => {
                  const isOwner = m.user_id === community.owner_id;
                  return (
                    <div key={m.user_id} className="flex items-center gap-2 py-1.5">
                      <span className="flex-1 text-sm font-medium truncate flex items-center gap-1.5">
                        {m.display_name}
                        {isOwner && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                        {m.muted && <MicOff className="w-3.5 h-3.5 text-orange-500" />}
                      </span>
                      {!isOwner && (
                        <>
                          <button
                            disabled={busy === m.user_id}
                            onClick={() => (m.muted ? unmute(m.user_id, m.display_name) : mute(m.user_id, m.display_name))}
                            className="px-2.5 py-1 rounded-full text-[12px] font-medium border border-border hover:bg-accent transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {m.muted ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                            {m.muted ? "Unmute" : "Mute"}
                          </button>
                          <button
                            disabled={busy === m.user_id}
                            onClick={() => {
                              if (window.confirm(`Ban ${m.display_name} from ${community.name}?`)) {
                                ban(m.user_id, m.display_name);
                              }
                            }}
                            className="px-2.5 py-1 rounded-full text-[12px] font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <Ban className="w-3 h-3" /> Ban
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {banned.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Banned ({banned.length})
                </p>
                <div className="space-y-1">
                  {banned.map((b) => (
                    <div key={b.user_id} className="flex items-center gap-2 py-1.5">
                      <span className="flex-1 text-sm font-medium truncate text-muted-foreground">{b.display_name}</span>
                      <button
                        disabled={busy === b.user_id}
                        onClick={() => unban(b.user_id, b.display_name)}
                        className="px-2.5 py-1 rounded-full text-[12px] font-medium border border-border hover:bg-accent transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Undo2 className="w-3 h-3" /> Unban
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
