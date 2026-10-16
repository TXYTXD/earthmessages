import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/contexts/LanguageContext";
import { snappy } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  NEWS_CATEGORIES,
  NEWS_EMOJIS,
  type NewsCategory,
  type NewsDraft,
  type NewsPost,
} from "@/hooks/useNews";
import { categoryStyle } from "@/components/news/categoryStyle";

const TITLE_MAX = 120;
const CONTENT_MAX = 4000;

const EMPTY: NewsDraft = { title: "", content: "", category: "update", emoji: "📣", kids_ok: true };

/**
 * Where a verified account writes a post. The same dialog edits one: pass
 * `post` and the fields come pre-filled and the button says Save.
 */
export function NewsEditorDialog({ open, onOpenChange, post, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: NewsPost | null;
  onSubmit: (draft: NewsDraft) => Promise<boolean>;
}) {
  const t = useT();
  const [draft, setDraft] = useState<NewsDraft>(EMPTY);
  const [busy, setBusy] = useState(false);

  // Start from the post being edited, or from a clean slate, every time it opens.
  useEffect(() => {
    if (!open) return;
    setDraft(
      post
        ? { title: post.title, content: post.content, category: post.category, emoji: post.emoji, kids_ok: post.kids_ok }
        : EMPTY
    );
  }, [open, post]);

  const canSend = draft.title.trim().length > 0 && draft.content.trim().length > 0 && !busy;

  const submit = async () => {
    if (!canSend) return;
    setBusy(true);
    const ok = await onSubmit(draft);
    setBusy(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-[560px] w-[calc(100%-1.5rem)] rounded-[26px] p-5 sm:p-6 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-bold flex items-center gap-2.5">
            <span className="text-[28px] leading-none">{draft.emoji}</span>
            {post ? t("news.editorEditTitle") : t("news.editorTitle")}
          </DialogTitle>
        </DialogHeader>

        {/* Cover */}
        <section>
          <p className="text-[13px] font-semibold text-muted-foreground mb-2">{t("news.pickCover")}</p>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {NEWS_EMOJIS.map((e) => {
              const on = draft.emoji === e;
              return (
                <motion.button
                  key={e}
                  type="button"
                  whileTap={{ scale: 0.86 }}
                  transition={snappy}
                  aria-pressed={on}
                  aria-label={e}
                  onClick={() => setDraft((d) => ({ ...d, emoji: e }))}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-[24px] leading-none",
                    on ? "bg-primary/18 ring-2 ring-primary" : "bg-secondary/70 hover:bg-accent"
                  )}
                >
                  {e}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Kind */}
        <section>
          <p className="text-[13px] font-semibold text-muted-foreground mb-2">{t("news.category")}</p>
          <div className="flex flex-wrap gap-1.5">
            {NEWS_CATEGORIES.map((c: NewsCategory) => {
              const s = categoryStyle(c);
              const on = draft.category === c;
              return (
                <motion.button
                  key={c}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  transition={snappy}
                  aria-pressed={on}
                  onClick={() => setDraft((d) => ({ ...d, category: c }))}
                  className={cn(
                    "h-10 px-3.5 rounded-full text-[14px] font-semibold flex items-center gap-1.5",
                    on ? `${s.bg} ${s.text} ring-2 ${s.ring}` : "bg-secondary/70 text-foreground hover:bg-accent"
                  )}
                >
                  <span aria-hidden="true">{s.emoji}</span>
                  {t(s.labelKey)}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Words */}
        <section className="flex flex-col gap-3">
          <div>
            <Input
              value={draft.title}
              maxLength={TITLE_MAX}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder={t("news.titlePlaceholder")}
              className="h-12 rounded-2xl text-[17px] font-semibold px-4"
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1 tabular-nums">
              {draft.title.length}/{TITLE_MAX}
            </p>
          </div>
          <div>
            <Textarea
              value={draft.content}
              maxLength={CONTENT_MAX}
              rows={6}
              onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
              placeholder={t("news.contentPlaceholder")}
              className="rounded-2xl text-[16px] leading-relaxed px-4 py-3 resize-y min-h-[140px]"
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1 tabular-nums">
              {draft.content.length}/{CONTENT_MAX}
            </p>
          </div>
        </section>

        {/* Who it is for */}
        <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/60 cursor-pointer">
          <span className="text-[24px] leading-none" aria-hidden="true">🧒</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold">{t("news.okForKids")}</span>
            <span className="block text-[12px] text-muted-foreground">{t("news.okForKidsHint")}</span>
          </span>
          <Switch
            checked={draft.kids_ok}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, kids_ok: v }))}
            className="flex-shrink-0 tap-pad"
          />
        </label>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" className="rounded-full h-11" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="button" className="rounded-full h-11 px-6 font-semibold" onClick={() => void submit()} disabled={!canSend}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {post ? t("news.save") : t("news.publish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
