-- News grows up: it can be written from inside the app, reacted to, and
-- kept suitable for the children who read it.
--
-- Until now a post could only be added by hand in the database dashboard,
-- which is why the page sat empty. Verified accounts can now publish from
-- the page itself. Readers can react. Every post says whether it is for
-- kids, and the page keeps a "kid mode" on by default.

ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'update'
    CHECK (category IN ('update', 'fun', 'tip', 'safety')),
  ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '📣'
    CHECK (char_length(emoji) BETWEEN 1 AND 8),
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kids_ok boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.news_posts
  ADD CONSTRAINT news_posts_title_len CHECK (char_length(title) BETWEEN 1 AND 120),
  ADD CONSTRAINT news_posts_content_len CHECK (char_length(content) BETWEEN 1 AND 4000);

-- Who may publish: the verified accounts. Read through a definer so the
-- policy does not depend on how profiles happen to be readable.
CREATE OR REPLACE FUNCTION public.is_verified_user(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_verified FROM public.profiles WHERE user_id = p_user LIMIT 1),
    false
  );
$$;

CREATE POLICY "Verified users can publish news" ON public.news_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id AND public.is_verified_user(auth.uid()));

CREATE POLICY "Authors can edit their news" ON public.news_posts
  FOR UPDATE USING (auth.uid() = author_id AND public.is_verified_user(auth.uid()))
  WITH CHECK (auth.uid() = author_id AND public.is_verified_user(auth.uid()));

CREATE POLICY "Authors can remove their news" ON public.news_posts
  FOR DELETE USING (auth.uid() = author_id AND public.is_verified_user(auth.uid()));

-- ------------------------------------------------------------- reactions
CREATE TABLE public.news_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- A small fixed set, so it stays friendly whoever is tapping.
  emoji text NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '🎉', '😮')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);

CREATE INDEX news_reactions_post_idx ON public.news_reactions (post_id);

ALTER TABLE public.news_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are publicly readable" ON public.news_reactions
  FOR SELECT USING (true);

CREATE POLICY "Signed-in users can react" ON public.news_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can take back their reaction" ON public.news_reactions
  FOR DELETE USING (auth.uid() = user_id);
