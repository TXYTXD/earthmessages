import { NavLink, useLocation } from "react-router-dom";
import { MessageCircle, Camera, UsersRound, Phone, Sparkles, Calendar, Settings2, CircleUser } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useElementStyle } from "@/hooks/useElementStyle";
import { useT } from "@/contexts/LanguageContext";
import { springy, snappy } from "@/lib/motion";

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

const COLS = navItems.length;

function BottomNavItem({ item, isActive }: { item: (typeof navItems)[number]; isActive: boolean }) {
  const t = useT();
  const own = useElementStyle(item.el);
  const active = useElementStyle("nav.active");
  const idle = useElementStyle("nav.idle");
  const state = isActive ? active : idle;
  const Icon = own.Icon ?? item.icon;
  const label = t(item.labelKey);

  return (
    <NavLink
      to={item.path}
      onClick={() => { own.play(); state.play(); }}
      aria-label={label}
      title={label}
      className={cn(
        "relative h-full flex items-center justify-center rounded-full",
        isActive ? "text-primary" : "text-muted-foreground",
        own.className || state.className
      )}
      style={{ ...state.style, ...own.style }}
    >
      <motion.span
        className="relative block"
        whileTap={{ scale: 0.78 }}
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={snappy}
      >
        <Icon className={cn("w-[21px] h-[21px]", isActive ? "[stroke-width:2.2]" : "[stroke-width:1.7]")} />
      </motion.span>
    </NavLink>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  const bar = useElementStyle("nav.bar");
  const activeIndex = navItems.findIndex((i) => i.path === location.pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom pointer-events-none">
      <div className="px-3 pt-1.5 pb-3.5 pointer-events-auto">
        <div
          className="glass-nav glass-float rounded-full h-[58px] px-1.5 gpu"
          style={bar.style}
        >
          {/* Eight equal columns that never change size. The highlight is one
              element sliding across them on a transform — nothing here
              re-measures or re-lays-out when you switch tab, which is what
              made jumping from the first tab to the last stutter. */}
          <div className="relative h-full grid items-center" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {activeIndex >= 0 && (
              <motion.span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 left-0 rounded-full bg-primary/12 ring-1 ring-inset ring-primary/15 pointer-events-none gpu"
                style={{ width: `${100 / COLS}%` }}
                initial={false}
                animate={{ x: `${activeIndex * 100}%` }}
                transition={springy}
              />
            )}
            {navItems.map((item) => (
              <BottomNavItem key={item.path} item={item} isActive={location.pathname === item.path} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
