import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CircleDot, Globe2, CalendarDays, Palette, Settings, User } from "lucide-react";
import { useT } from "@/contexts/LanguageContext";
import { useElementStyle } from "@/hooks/useElementStyle";
import { backdrop, sheetUp, springy, stagger, riseIn, tapSoft } from "@/lib/motion";

// Everything that used to be crammed into the bottom bar. Eight tabs sharing
// a phone's width left each one about a fingernail wide with a nine-pixel
// label; here each has room for its name and a line saying what it does.
const ITEMS = [
  { icon: CircleDot, path: "/stories", el: "nav.stories", labelKey: "nav.stories" as const, hintKey: "more.storiesHint" as const },
  { icon: Globe2, path: "/communities", el: "nav.communities", labelKey: "nav.communities" as const, hintKey: "more.communitiesHint" as const },
  { icon: CalendarDays, path: "/calendar", el: "nav.calendar", labelKey: "nav.calendar" as const, hintKey: "more.calendarHint" as const },
  { icon: Palette, path: "/themes", el: "nav.settings", labelKey: "more.themes" as const, hintKey: "more.themesHint" as const },
  { icon: Settings, path: "/settings", el: "nav.settings", labelKey: "nav.settings" as const, hintKey: "more.settingsHint" as const },
  { icon: User, path: "/account", el: "nav.account", labelKey: "nav.account" as const, hintKey: "more.accountHint" as const },
];

function MoreRow({ item, onGo }: { item: (typeof ITEMS)[number]; onGo: (path: string) => void }) {
  const t = useT();
  const own = useElementStyle(item.el);
  const Icon = own.Icon ?? item.icon;

  return (
    <motion.button
      type="button"
      variants={riseIn}
      whileTap={tapSoft}
      onClick={() => { own.play(); onGo(item.path); }}
      className={`w-full flex items-center gap-3.5 p-3.5 rounded-[22px] text-left glass-tint glass-float press-soft ${own.className}`}
      style={own.style}
    >
      <span className="w-11 h-11 rounded-2xl bg-primary/12 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-semibold leading-tight">{t(item.labelKey)}</span>
        <span className="block text-[13px] text-muted-foreground mt-0.5 truncate">{t(item.hintKey)}</span>
      </span>
    </motion.button>
  );
}

export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const t = useT();

  // A sheet that stays open while the page behind it scrolls feels broken.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const go = (path: string) => { onClose(); navigate(path); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={backdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-foreground/25 backdrop-blur-[2px] md:hidden"
            aria-hidden="true"
          />
          <motion.div
            variants={sheetUp}
            initial="hidden"
            animate="show"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 640) onClose(); }}
            role="dialog"
            aria-label={t("more.title")}
            className="fixed left-2.5 right-2.5 bottom-2.5 z-[61] rounded-[34px] glass-tint glass-float px-3 pt-2.5 pb-4 md:hidden safe-bottom"
          >
            <div className="flex justify-center pt-1 pb-3">
              <span className="w-11 h-[5px] rounded-full bg-foreground/20" />
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springy}
              className="text-[24px] font-bold px-1.5 pb-3"
            >
              {t("more.title")}
            </motion.h2>
            <motion.div
              variants={stagger(0.045, 0.06)}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-2"
            >
              {ITEMS.map((item) => (
                <MoreRow key={item.path} item={item} onGo={go} />
              ))}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
