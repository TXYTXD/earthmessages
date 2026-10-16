import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Newspaper, Loader2, PenLine, Pencil, Trash2, Volume2, Square } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useNews, markNewsSeen, readNewsLastSeen, NEWS_CATEGORIES, NEWS_REACTIONS,
  type NewsCategory, type NewsPost, type NewsReaction,
} from "@/hooks/useNews";
import { NewsEditorDialog } from "@/components/news/NewsEditorDialog";
import { categoryStyle } from "@/components/news/categoryStyle";
import { riseIn, stagger, springy, snappy } from "@/lib/motion";
import { cn } from "@/lib/utils";

const KID_MODE_KEY = "ums-news-kid-mode";

function loadKidMode(): boolean {
  try {
    return localStorage.getItem(KID_MODE_KEY) !== "off";
  } catch {
    return true;
  }
}

// The browser voice speaks whatever language the interface is in.
const SPEECH_LANG: Record<string, string> = {
  en: "en-US", el: "el-GR", es: "es-ES", zh: "zh-CN", ar: "ar-SA",
};

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", ...(days > 300 ? { year: "numeric" } : {}) });
}

function Chip({ on, onClick, children, className }: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      transition={snappy}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-10 px-3.5 rounded-full text-[14px] font-semibold flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap",
        on ? "bg-primary text-primary-foreground" : "glass-tint glass-float text-foreground",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

function PostCard({ post, isNew, mine, speaking, onReact, onSpeak, onEdit, onDelete }: {
  post: NewsPost;
  isNew: boolean;
  mine: boolean;
  speaking: boolean;
  onReact: (emoji: NewsReaction) => void;
  onSpeak: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const s = categoryStyle(post.category);

  return (
    <motion.article
      variants={riseIn}
      layout
      className="rounded-[26px] glass-tint glass-float p-4 sm:p-5 min-w-0"
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <motion.div
          whileTap={{ scale: 0.92, rotate: -6 }}
          transition={snappy}
          className={cn("w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] flex items-center justify-center text-[30px] sm:text-[34px] leading-none flex-shrink-0 select-none", s.bg)}
          aria-hidden="true"
        >
          {post.emoji}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap text-[12px] font-semibold">
            <span className={cn("px-2 py-0.5 rounded-full", s.bg, s.text)}>
              {s.emoji} {t(s.labelKey)}
            </span>
            {!post.kids_ok && (
              <span className="px-2 py-0.5 rounded-full bg-foreground/8 text-muted-foreground">
                🧑 {t("news.grownUps")}
              </span>
            )}
            {isNew && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springy}
                className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground"
              >
                {t("news.new")}
              </motion.span>
            )}
            <span className="text-muted-foreground font-medium ms-auto tabular-nums">{dateLabel(post.created_at)}</span>
          </div>
          <h2 className="text-[20px] sm:text-[22px] font-bold leading-snug mt-1.5 break-words">{post.title}</h2>
        </div>
      </div>

      <p className="text-[16px] sm:text-[17px] leading-relaxed whitespace-pre-wrap break-words mt-3 text-foreground/90">
        {post.content}
      </p>

      {post.author_name && (
        <p className="text-[12px] text-muted-foreground mt-2">{t("news.by", { name: post.author_name })}</p>
      )}

      <div className="flex items-center gap-1.5 mt-3.5 flex-wrap">
        {NEWS_REACTIONS.map((e) => {
          const n = post.reactions[e] ?? 0;
          const on = post.mine.has(e);
          return (
            <motion.button
              key={e}
              type="button"
              whileTap={{ scale: 0.84 }}
              transition={snappy}
              aria-pressed={on}
              aria-label={`${e} ${n}`}
              onClick={() => onReact(e)}
              className={cn(
                "h-10 min-w-10 px-2.5 rounded-full flex items-center gap-1 text-[17px] leading-none press",
                on ? "bg-primary/15 ring-2 ring-primary/50" : "bg-secondary/70"
              )}
            >
              <span aria-hidden="true">{e}</span>
              <AnimatePresence mode="popLayout" initial={false}>
                {n > 0 && (
                  <motion.span
                    key={n}
                    initial={{ y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -6, opacity: 0 }}
                    transition={snappy}
                    className="text-[13px] font-bold tabular-nums"
                  >
                    {n}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}

        <span className="flex-1" />

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          transition={snappy}
          aria-pressed={speaking}
          aria-label={speaking ? t("news.stopReading") : t("news.readAloud")}
          title={speaking ? t("news.stopReading") : t("news.readAloud")}
          onClick={onSpeak}
          className={cn(
            "h-10 px-3 rounded-full flex items-center gap-1.5 text-[13px] font-semibold press",
            speaking ? "bg-primary text-primary-foreground" : "bg-secondary/70 text-foreground"
          )}
        >
          {speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="hidden xs:inline">{speaking ? t("news.stopReading") : t("news.readAloud")}</span>
        </motion.button>

        {mine && (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label={t("news.edit")}
              title={t("news.edit")}
              className="w-10 h-10 rounded-full press flex items-center justify-center text-muted-foreground"
            >
              <Pencil className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={t("news.delete")}
              title={t("news.delete")}
              className="w-10 h-10 rounded-full press flex items-center justify-center text-destructive"
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          </>
        )}
      </div>
    </motion.article>
  );
}

export default function NewsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { posts, loading, canPublish, toggleReaction, publish, update, remove } = useNews();

  const [kidMode, setKidMode] = useState(loadKidMode);
  const [filter, setFilter] = useState<NewsCategory | "all">("all");
  const [editing, setEditing] = useState<NewsPost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<NewsPost | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Remember when this person last looked, THEN mark now as seen: the
  // "New" badges are measured against the earlier visit, not this one.
  const lastSeen = useRef<number>(readNewsLastSeen());
  useEffect(() => {
    if (!loading) markNewsSeen();
  }, [loading]);

  useEffect(() => {
    try {
      localStorage.setItem(KID_MODE_KEY, kidMode ? "on" : "off");
    } catch {
      /* private browsing */
    }
  }, [kidMode]);

  // Nothing keeps talking after the page is gone.
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* unsupported */ } }, []);

  const visible = useMemo(
    () => posts.filter((p) => (kidMode ? p.kids_ok : true) && (filter === "all" || p.category === filter)),
    [posts, kidMode, filter]
  );

  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback((post: NewsPost) => {
    if (!canSpeak) return;
    const synth = window.speechSynthesis;
    if (speakingId === post.id) {
      synth.cancel();
      setSpeakingId(null);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(`${post.title}. ${post.content}`);
    u.lang = SPEECH_LANG[language] ?? language;
    u.rate = 0.95;
    u.onend = () => setSpeakingId((cur) => (cur === post.id ? null : cur));
    u.onerror = () => setSpeakingId((cur) => (cur === post.id ? null : cur));
    setSpeakingId(post.id);
    synth.speak(u);
  }, [canSpeak, language, speakingId]);

  const react = useCallback(async (postId: string, emoji: NewsReaction) => {
    const r = await toggleReaction(postId, emoji);
    if (r === "signin") toast({ title: t("news.signInToReact") });
  }, [toggleReaction, t]);

  const openWrite = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (p: NewsPost) => { setEditing(p); setEditorOpen(true); };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await remove(toDelete.id);
    setToDelete(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background overflow-x-clip">
      <div className="max-w-[44rem] mx-auto px-3 sm:px-5 pb-10">
        {/* Header */}
        <motion.header
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springy}
          className="sticky top-2 z-20 mt-2 rounded-[26px] glass-tint glass-float px-3 py-2.5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate(user ? "/" : "/welcome")}
              aria-label={t("common.close")}
              className="w-10 h-10 rounded-full press flex items-center justify-center text-foreground flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 rtl:-scale-x-100" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Newspaper className="w-[18px] h-[18px] text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] sm:text-[24px] font-bold leading-tight truncate">{t("news.title")}</h1>
              <p className="text-[12px] text-muted-foreground truncate hidden xs:block">{t("news.subtitle")}</p>
            </div>

            <label
              className="flex items-center gap-2 h-10 px-2.5 rounded-full bg-secondary/70 cursor-pointer flex-shrink-0 select-none"
              title={t("news.kidModeHint")}
            >
              <span className="text-[18px] leading-none" aria-hidden="true">🧒</span>
              <span className="text-[13px] font-semibold hidden sm:inline">{t("news.kidMode")}</span>
              <Switch checked={kidMode} onCheckedChange={setKidMode} aria-label={t("news.kidMode")} className="flex-shrink-0 tap-pad" />
            </label>

            {canPublish && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                transition={snappy}
                onClick={openWrite}
                aria-label={t("news.write")}
                title={t("news.write")}
                className="h-10 px-3 sm:px-4 rounded-full bg-primary text-primary-foreground flex items-center gap-1.5 font-semibold text-[14px] flex-shrink-0"
              >
                <PenLine className="w-[18px] h-[18px]" />
                <span className="hidden sm:inline">{t("news.write")}</span>
              </motion.button>
            )}
          </div>

          {/* Kinds */}
          <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
            <Chip on={filter === "all"} onClick={() => setFilter("all")}>
              ✨ {t("news.all")}
            </Chip>
            {NEWS_CATEGORIES.map((c) => {
              const s = categoryStyle(c);
              return (
                <Chip key={c} on={filter === c} onClick={() => setFilter(c)}>
                  <span aria-hidden="true">{s.emoji}</span> {t(s.labelKey)}
                </Chip>
              );
            })}
          </div>
        </motion.header>

        {/* Posts */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springy}
            className="text-center py-20 px-6 mt-4 rounded-[26px] glass-tint glass-float"
          >
            <div className="text-[56px] leading-none mb-3" aria-hidden="true">{kidMode ? "🐣" : "📭"}</div>
            <p className="text-[16px] font-semibold">{kidMode && posts.length > 0 ? t("news.emptyKid") : t("news.empty")}</p>
          </motion.div>
        ) : (
          <motion.div
            key={`${filter}-${kidMode}`}
            variants={stagger(0.035, 0.04)}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3 mt-4"
          >
            <AnimatePresence initial={false}>
              {visible.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isNew={new Date(post.created_at).getTime() > lastSeen.current}
                  mine={!!user && post.author_id === user.id && canPublish}
                  speaking={speakingId === post.id}
                  onReact={(e) => void react(post.id, e)}
                  onSpeak={() => speak(post)}
                  onEdit={() => openEdit(post)}
                  onDelete={() => setToDelete(post)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <NewsEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        post={editing}
        onSubmit={async (draft) => {
          const ok = editing ? await update(editing.id, draft) : await publish(draft);
          if (ok && !editing) toast({ title: t("news.published") });
          return ok;
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent className="rounded-[26px] w-[calc(100%-1.5rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("news.delete")}</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              {t("news.deleteConfirm")}
              {toDelete ? ` “${toDelete.title}”` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void confirmDelete()}>
              {t("news.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
