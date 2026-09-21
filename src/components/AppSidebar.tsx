import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { springy, snappy } from "@/lib/motion";
import { MessageCircle, Video, Phone, Settings2, CircleUser, Camera, Sparkles, Calendar, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useElementStyle } from "@/hooks/useElementStyle";
import { useT } from "@/contexts/LanguageContext";

const navItems = [
  { icon: MessageCircle, labelKey: "nav.chats" as const, path: "/", el: "nav.chats" },
  { icon: Camera, labelKey: "nav.stories" as const, path: "/stories", el: "nav.stories" },
  { icon: UsersRound, labelKey: "nav.communities" as const, path: "/communities", el: "nav.communities" },
  { icon: Phone, labelKey: "nav.calls" as const, path: "/calls", el: "nav.calls" },
  { icon: Video, labelKey: "nav.video" as const, path: "/video", el: "nav.calls" },
  { icon: Sparkles, labelKey: "nav.aiChat" as const, path: "/ai", el: "nav.ai" },
  { icon: Calendar, labelKey: "nav.calendar" as const, path: "/calendar", el: "nav.calendar" },
  { icon: Settings2, labelKey: "nav.settings" as const, path: "/settings", el: "nav.settings" },
  { icon: CircleUser, labelKey: "nav.account" as const, path: "/account", el: "nav.account" },
];

// One nav button, wearing whatever the theme says about it
function SidebarItem({ item, isActive }: { item: (typeof navItems)[number]; isActive: boolean }) {
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
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
        isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
        own.className || state.className
      )}
      style={{ ...state.style, ...own.style }}
    >
      <motion.span
        animate={{ scale: isActive ? 1.1 : 1 }}
        whileTap={{ scale: 0.82, rotate: -8 }}
        whileHover={{ scale: isActive ? 1.14 : 1.08 }}
        transition={snappy}
      >
        <Icon className="w-5 h-5" />
      </motion.span>
      <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {t(item.labelKey)}
      </span>
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
      )}
    </NavLink>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const bar = useElementStyle("nav.bar");
  const logo = useElementStyle("nav.logo");
  const LogoIcon = logo.Icon ?? MessageCircle;

  return (
    <motion.aside
      initial={{ x: -26, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={springy}
      className="hidden md:flex w-[84px] h-screen flex-col items-center py-4 pl-3 pr-0"
    >
      <div
        className="w-[72px] flex-1 flex flex-col items-center py-4 rounded-[28px] glass-nav glass-float"
        style={bar.style}
      >
      {/* Logo */}
      <div
        className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-soft", logo.className)}
        style={{ background: "var(--messenger-gradient)" }}
        aria-label="UMS Messages"
      >
        {logo.Icon
          ? <LogoIcon className="w-5 h-5 text-white" />
          : <span className="text-white text-[17px] font-bold leading-none tracking-tight">U</span>}
      </div>

      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => (
          <SidebarItem key={item.path} item={item} isActive={location.pathname === item.path} />
        ))}
      </nav>

      {/* Avatar at bottom */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        transition={snappy}
        className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
      >
        <CircleUser className="w-4 h-4 text-muted-foreground" />
      </motion.div>
      </div>
    </motion.aside>
  );
}
