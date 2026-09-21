import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MessageCircle, Phone, Bot, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useElementStyle } from "@/hooks/useElementStyle";
import { useT } from "@/contexts/LanguageContext";
import { MoreSheet } from "@/components/MoreSheet";
import { springy, snappy } from "@/lib/motion";

// Four tabs, not eight. Everything else moved into the More sheet, where a
// name has room to be read. The bar itself floats clear of the screen edge
// and the chat list slides underneath it.
const navItems = [
  { icon: MessageCircle, labelKey: "nav.chats" as const, path: "/", el: "nav.chats" },
  { icon: Phone, labelKey: "nav.calls" as const, path: "/calls", el: "nav.calls" },
  { icon: Bot, labelKey: "nav.assistant" as const, path: "/ai", el: "nav.ai" },
];

const MORE_PATHS = ["/stories", "/communities", "/calendar", "/themes", "/settings", "/account"];

function TabPill() {
  return (
    <motion.span
      layoutId="bottom-nav-pill"
      className="absolute inset-0 rounded-[20px] pointer-events-none"
      style={{
        background: "hsl(var(--primary) / 0.13)",
        boxShadow: "0 0 0 1px hsl(var(--primary) / 0.18) inset",
      }}
      transition={springy}
    />
  );
}

function TabInner({ Icon, label, active }: { Icon: React.ComponentType<{ className?: string }>; label: string; active: boolean }) {
  return (
    <>
      {active && <TabPill />}
      <motion.span
        className="relative block"
        animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
        whileTap={{ scale: 0.82, rotate: -6 }}
        transition={snappy}
      >
        <Icon className={cn("w-[22px] h-[22px]", active ? "[stroke-width:2.2]" : "[stroke-width:1.8]")} />
      </motion.span>
      <motion.span
        className="relative text-[11px] font-semibold"
        animate={{ opacity: active ? 1 : 0.78 }}
        transition={springy}
      >
        {label}
      </motion.span>
    </>
  );
}

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
      className={cn(
        "relative flex-1 basis-0 flex flex-col items-center justify-center gap-[3px] h-[54px] rounded-[20px]",
        isActive ? "text-primary" : "text-muted-foreground",
        own.className || state.className
      )}
      style={{ ...state.style, ...own.style }}
    >
      <TabInner Icon={Icon} label={t(item.labelKey)} active={isActive} />
    </NavLink>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  const bar = useElementStyle("nav.bar");
  const moreEl = useElementStyle("nav.settings");
  const t = useT();
  const [showMore, setShowMore] = useState(false);

  const moreActive = showMore || MORE_PATHS.includes(location.pathname);
  const MoreIcon = moreEl.Icon ?? LayoutGrid;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom pointer-events-none">
        <div className="px-3.5 pt-2 pb-[18px] pointer-events-auto">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={springy}
            className="glass-nav glass-float rounded-[30px] flex items-center h-[70px] px-1"
            style={bar.style}
          >
            {navItems.map((item) => (
              <BottomNavItem key={item.path} item={item} isActive={location.pathname === item.path} />
            ))}

            <button
              type="button"
              onClick={() => { moreEl.play(); setShowMore(true); }}
              aria-label={t("more.title")}
              className={cn(
                "relative flex-1 basis-0 flex flex-col items-center justify-center gap-[3px] h-[54px] rounded-[20px]",
                moreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <TabInner Icon={MoreIcon} label={t("nav.more")} active={moreActive} />
            </button>
          </motion.div>
        </div>
      </nav>

      <MoreSheet open={showMore} onClose={() => setShowMore(false)} />
    </>
  );
}
