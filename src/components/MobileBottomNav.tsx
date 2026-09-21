import { NavLink, useLocation } from "react-router-dom";
import { MessageCircle, Camera, UsersRound, Phone, Sparkles, Calendar, Settings2, CircleUser } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useElementStyle } from "@/hooks/useElementStyle";
import { useT } from "@/contexts/LanguageContext";
import { springy, snappy } from "@/lib/motion";

// Every destination is back in the bar, the way it was. What changed is that
// they no longer all shout at once: the seven you are not on are icons, and
// the one you are on opens into a pill with its name. Eight labels at nine
// pixels was what made the old bar unreadable, not the eight buttons.
const navItems = [
  { icon: MessageCircle, labelKey: "nav.chats" as const, path: "/", el: "nav.chats" },
  { icon: Camera, labelKey: "nav.stories" as const, path: "/stories", el: "nav.stories" },
  { icon: UsersRound, labelKey: "nav.groups" as const, path: "/communities", el: "nav.communities" },
  { icon: Phone, labelKey: "nav.calls" as const, path: "/calls", el: "nav.calls" },
  { icon: Sparkles, labelKey: "nav.ai" as const, path: "/ai", el: "nav.ai" },
  { icon: Calendar, labelKey: "nav.plan" as const, path: "/calendar", el: "nav.calendar" },
  { icon: Settings2, labelKey: "nav.settings" as const, path: "/settings", el: "nav.settings" },
  { icon: CircleUser, labelKey: "nav.account" as const, path: "/account", el: "nav.account" },
];

function BottomNavItem({ item, isActive }: { item: (typeof navItems)[number]; isActive: boolean }) {
  const t = useT();
  const own = useElementStyle(item.el);
  const active = useElementStyle("nav.active");
  const idle = useElementStyle("nav.idle");
  const state = isActive ? active : idle;
  const Icon = own.Icon ?? item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={() => { own.play(); state.play(); }}
      aria-label={t(item.labelKey)}
      // Flex weights rather than fixed widths, so eight of these always fit,
      // on a narrow phone as much as a wide one.
      className={cn(
        "relative min-w-0 h-11 rounded-full flex items-center justify-center gap-1.5 px-0",
        isActive ? "flex-[2.3] text-primary" : "flex-1 text-muted-foreground",
        own.className || state.className
      )}
      style={{ ...state.style, ...own.style }}
    >
      {isActive && (
        <motion.span
          layoutId="bottom-nav-pill"
          className="absolute inset-0 rounded-full bg-primary/10 ring-1 ring-inset ring-primary/15 pointer-events-none"
          transition={springy}
        />
      )}
      <motion.span
        className="relative flex-shrink-0"
        whileTap={{ scale: 0.82 }}
        animate={{ scale: isActive ? 1.04 : 1 }}
        transition={snappy}
      >
        <Icon className={cn("w-5 h-5", isActive ? "[stroke-width:2.1]" : "[stroke-width:1.7]")} />
      </motion.span>
      {isActive && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          transition={springy}
          className="relative text-[12px] font-semibold truncate pr-1"
        >
          {t(item.labelKey)}
        </motion.span>
      )}
    </NavLink>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  const bar = useElementStyle("nav.bar");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom pointer-events-none">
      <div className="px-3 pt-1.5 pb-3.5 pointer-events-auto">
        <motion.div
          initial={{ y: 34, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springy}
          className="glass-nav glass-float rounded-full flex items-center h-[60px] px-1.5 gap-0.5"
          style={bar.style}
        >
          {navItems.map((item) => (
            <BottomNavItem key={item.path} item={item} isActive={location.pathname === item.path} />
          ))}
        </motion.div>
      </div>
    </nav>
  );
}
