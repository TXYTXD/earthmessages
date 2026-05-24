import { NavLink, useLocation } from "react-router-dom";
import { MessageCircle, CircleDot, Phone, Bot, Settings, User } from "lucide-react";
import { motion } from "framer-motion";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom">
      <div className="px-3 pt-2 pb-2">
        <div className="glass-nav border border-border/60 rounded-2xl shadow-premium flex items-center justify-around h-14 px-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-11 rounded-xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <item.icon className="w-5 h-5 relative" />
                <span className="text-[10px] font-medium relative">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
