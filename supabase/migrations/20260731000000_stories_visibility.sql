-- Stories can be private (friends only, the default) or public (any user)
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));

DROP POLICY IF EXISTS "Friends can view stories" ON public.stories;
CREATE POLICY "Friends can view stories" ON public.stories
  FOR SELECT USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_requests
      WHERE status = 'accepted'
      AND ((sender_id = auth.uid() AND receiver_id = stories.user_id)
        OR (receiver_id = auth.uid() AND sender_id = stories.user_id))
    )
  );
