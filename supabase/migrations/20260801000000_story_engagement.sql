-- Likes and comments on stories.
-- Visibility carries over from stories: the EXISTS subqueries run under the
-- stories RLS policy, so only users who can see a story can see or add
-- its likes/comments.
CREATE TABLE public.story_likes (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);

ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers can see story likes" ON public.story_likes
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.stories WHERE id = story_id));

CREATE POLICY "Users can like visible stories" ON public.story_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.stories WHERE id = story_id)
  );

CREATE POLICY "Users can remove own likes" ON public.story_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX story_comments_story_idx ON public.story_comments (story_id, created_at);

CREATE POLICY "Viewers can see story comments" ON public.story_comments
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.stories WHERE id = story_id));

CREATE POLICY "Users can comment on visible stories" ON public.story_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.stories WHERE id = story_id)
  );

CREATE POLICY "Users can delete own comments" ON public.story_comments
  FOR DELETE USING (auth.uid() = user_id);
