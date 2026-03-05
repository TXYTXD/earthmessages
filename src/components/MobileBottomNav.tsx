import { NavLink, useLocation } from "react-router-dom";
import { MessageCircle, CircleDot, Phone, Bot, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: MessageCircle, label: "Chats", path: "/" },
  { icon: CircleDot, label: "Stories", path: "/stories" },
  { icon: Phone, label: "Calls", path: "/calls" },
  { icon: Bot, label: "AI", path: "/ai" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: User, label: "Account", path: "/account" },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden safe-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
