import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MessageSquare, Video, Phone, Settings, User, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: MessageSquare, label: "Chats", path: "/" },
  { icon: Video, label: "Video Call", path: "/video" },
  { icon: Phone, label: "Calls", path: "/calls" },
  { icon: Globe, label: "Translation", path: "/settings" },
  { icon: User, label: "Account", path: "/account" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-screen flex flex-col bg-sidebar border-r border-sidebar-border relative z-10"
    >
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="text-lg font-bold gradient-text">LinguaCall</h1>
              <p className="text-xs text-muted-foreground">Connect & Translate</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 w-[3px] h-8 bg-primary rounded-r-full"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="m-3 p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
}
