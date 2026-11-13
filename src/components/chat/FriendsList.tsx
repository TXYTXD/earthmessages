import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useFriends, type Friend } from "@/hooks/useFriends";
import { useIsSinglePane } from "@/hooks/use-mobile";
import { snappy } from "@/lib/motion";

interface FriendsListProps {
  onSelect: (friend: Friend) => void;
}

/**
 * The strip of friends above the conversations. It scrolls sideways when
 * there are more than fit, and fades at whichever edge has more behind it,
 * so a half-cut avatar reads as "there's more" rather than "it's broken".
 */
export function FriendsList({ onSelect }: FriendsListProps) {
  const { friends, loading } = useFriends();
  const singlePane = useIsSinglePane();
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Which edges have content hidden past them. Re-checked whenever the
  // row's size changes, which is what "scaling" means here.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const check = () => {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setEdges((cur) => (cur.left === left && cur.right === right ? cur : { left, right }));
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [friends.length, loading]);

  if (loading || friends.length === 0) return null;

  // Show online friends first, then offline
  const sorted = [...friends].sort((a, b) => Number(b.is_online) - Number(a.is_online));
  const online = friends.filter((f) => f.is_online).length;

  // Sized by the pane it sits in, not the window: the desktop side panel is
  // 320px wide whatever the screen is doing.
  const cell = singlePane ? "w-[64px]" : "w-[60px]";
  const avatar = singlePane ? "w-12 h-12 text-[13px]" : "w-11 h-11 text-[12px]";

  const fade =
    edges.left && edges.right
      ? "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)"
      : edges.right
        ? "linear-gradient(to right, black calc(100% - 28px), transparent)"
        : edges.left
          ? "linear-gradient(to right, transparent, black 28px)"
          : undefined;

  return (
    <div className="px-1 pt-1 pb-1.5 min-w-0">
      <div className="flex items-baseline gap-1.5 px-2 mb-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Friends</p>
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">· {friends.length}</span>
        {online > 0 && (
          <span className="text-[11px] text-success tabular-nums flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            {online}
          </span>
        )}
      </div>
      <div
        ref={rowRef}
        className="flex gap-0.5 overflow-x-auto scrollbar-none snap-x snap-proximity scroll-px-1 px-1 min-w-0"
        style={fade ? { WebkitMaskImage: fade, maskImage: fade } : undefined}
      >
        {sorted.map((friend) => (
          <motion.button
            key={friend.user_id}
            type="button"
            whileTap={{ scale: 0.92 }}
            transition={snappy}
            onClick={() => onSelect(friend)}
            title={friend.display_name}
            className={`flex flex-col items-center gap-1 flex-shrink-0 snap-start rounded-2xl py-1 min-w-0 group ${cell}`}
          >
            <div className="relative">
              <div className={`${avatar} rounded-full bg-secondary ring-1 ring-border/60 flex items-center justify-center font-semibold text-foreground group-hover:ring-2 group-hover:ring-primary/40 transition-shadow`}>
                {(friend.display_name || "?").slice(0, 2).toUpperCase()}
              </div>
              {friend.is_online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
              )}
            </div>
            <span className="text-[11px] leading-tight text-muted-foreground truncate w-full px-0.5 text-center">
              {friend.display_name?.split(" ")[0]}{friend.verified ? " ✔" : ""}
            </span>
          </motion.button>
        ))}
      </div>
      {/* A hairline, not a bar, between the people and the conversations */}
      <div className="mx-3 mt-1 h-px bg-border/50" />
    </div>
  );
}
