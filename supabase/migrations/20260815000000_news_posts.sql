-- News/announcements shown on the public /news page.
-- Read-only for the world; posts are added by the project owner via the
-- Supabase dashboard (no INSERT/UPDATE/DELETE policies on purpose).
CREATE TABLE public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News is publicly readable" ON public.news_posts
  FOR SELECT USING (true);
