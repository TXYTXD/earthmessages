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
      {/* Ambient glow behind the nav bar */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[85%] h-16 bg-primary/10 blur-[48px] rounded-full pointer-events-none" />
      
      <div className="px-3 pt-2 pb-2">
        <div className="glass-nav rounded-3xl flex items-center justify-around h-[3.75rem] px-1 relative overflow-hidden">
          {/* Subtle top highlight line */}
          <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-primary/25 to-transparent pointer-events-none" />
          
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-12 rounded-2xl transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background: "linear-gradient(180deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 100%)",
                      boxShadow: "0 0 20px -4px hsl(var(--primary) / 0.35), 0 1px 0 0 hsl(var(--primary) / 0.15) inset",
                      border: "1px solid hsl(var(--primary) / 0.15)",
                      backdropFilter: "blur(16px) saturate(150%)",
                      WebkitBackdropFilter: "blur(16px) saturate(150%)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 28,
                      mass: 0.8,
                    }}
                  />
                )}
                
                <motion.div
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 20,
                    mass: 0.6,
                  }}
                  className="relative"
                >
                  <item.icon 
                    className={cn(
                      "w-[1.15rem] h-[1.15rem] transition-all duration-300",
                      isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                    )} 
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                </motion.div>
                
                <motion.span 
                  className="text-[9px] font-semibold tracking-wide relative uppercase"
                  animate={{
                    opacity: isActive ? 1 : 0.75,
                    y: isActive ? 0 : 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                >
                  {item.label}
                </motion.span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
