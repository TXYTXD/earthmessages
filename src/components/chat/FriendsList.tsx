import { useFriends, type Friend } from "@/hooks/useFriends";

interface FriendsListProps {
  onSelect: (friend: Friend) => void;
}

export function FriendsList({ onSelect }: FriendsListProps) {
  const { friends, loading } = useFriends();

  if (loading || friends.length === 0) return null;

  // Show online friends first, then offline
  const sorted = [...friends].sort((a, b) => Number(b.is_online) - Number(a.is_online));

  return (
    <div className="px-4 py-2 border-b border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Friends</p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {sorted.map((friend) => (
          <button
            key={friend.user_id}
            onClick={() => onSelect(friend)}
            className="flex flex-col items-center gap-1 min-w-[56px] group"
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                {(friend.display_name || "?").slice(0, 2).toUpperCase()}
              </div>
              {friend.is_online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
              )}
            </div>
            <span className="text-[11px] text-muted-foreground truncate max-w-[56px]">
              {friend.display_name?.split(" ")[0]}{friend.verified ? " ✔" : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
