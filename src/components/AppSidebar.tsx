import { NavLink, useLocation } from "react-router-dom";
import { MessageCircle, Video, Phone, Settings, User, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: MessageCircle, label: "Chats", path: "/" },
  { icon: CircleDot, label: "Stories", path: "/stories" },
  { icon: Phone, label: "Calls", path: "/calls" },
  { icon: Video, label: "Video", path: "/video" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: User, label: "Account", path: "/account" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-[72px] h-screen flex flex-col items-center py-3 bg-card border-r border-border">
      {/* Logo */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--messenger-gradient)" }}>
        <MessageCircle className="w-5 h-5 text-white" />
      </div>

      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <item.icon className="w-5 h-5" />
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Avatar at bottom */}
      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
        <User className="w-4 h-4 text-muted-foreground" />
      </div>
    </aside>
  );
}
