import { NavLink, useLocation } from "react-router-dom";
import { MessageCircle, Video, Phone, Settings, User, CircleDot, Bot, CalendarDays, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useElementStyle } from "@/hooks/useElementStyle";

const navItems = [
  { icon: MessageCircle, label: "Chats", path: "/", el: "nav.chats" },
  { icon: CircleDot, label: "Stories", path: "/stories", el: "nav.stories" },
  { icon: Globe2, label: "Communities", path: "/communities", el: "nav.communities" },
  { icon: Phone, label: "Calls", path: "/calls", el: "nav.calls" },
  { icon: Video, label: "Video", path: "/video", el: "nav.calls" },
  { icon: Bot, label: "AI Chat", path: "/ai", el: "nav.ai" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar", el: "nav.calendar" },
  { icon: Settings, label: "Settings", path: "/settings", el: "nav.settings" },
  { icon: User, label: "Account", path: "/account", el: "nav.account" },
];

// One nav button, wearing whatever the theme says about it
function SidebarItem({ item, isActive }: { item: (typeof navItems)[number]; isActive: boolean }) {
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
      <Icon className="w-5 h-5" />
      <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {item.label}
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
    <aside
      className="hidden md:flex w-[72px] h-screen flex-col items-center py-3 glass-nav border-r border-border/60"
      style={bar.style}
    >
      {/* Logo */}
      <div
        className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-4", logo.className)}
        style={{ background: "var(--messenger-gradient)" }}
      >
        <LogoIcon className="w-5 h-5 text-white" />
      </div>

      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => (
          <SidebarItem key={item.path} item={item} isActive={location.pathname === item.path} />
        ))}
      </nav>

      {/* Avatar at bottom */}
      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
        <User className="w-4 h-4 text-muted-foreground" />
      </div>
    </aside>
  );
}
