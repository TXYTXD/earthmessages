-- Community moderation: owners can mute (member stays but can't send)
-- and ban (kicked out and can't rejoin) members of their communities.

CREATE TABLE public.community_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ban', 'mute')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id, action)
);

ALTER TABLE public.community_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage moderation" ON public.community_moderation
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.owner_id = auth.uid())
  );

-- Users can see their own moderation status (so the app can tell them)
CREATE POLICY "Users see own moderation" ON public.community_moderation
  FOR SELECT USING (user_id = auth.uid());

-- Muted members cannot send messages in the community's conversation
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.community_moderation m
      JOIN public.communities c ON c.id = m.community_id
      WHERE c.conversation_id = messages.conversation_id
        AND m.user_id = auth.uid() AND m.action = 'mute'
    )
  );

-- Banned users cannot rejoin the community
DROP POLICY IF EXISTS "Users can add members to conversations" ON public.conversation_members;
CREATE POLICY "Users can add members to conversations" ON public.conversation_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
    OR (
      user_id = auth.uid()
      AND (
        EXISTS (
          SELECT 1 FROM public.conversations cv
          WHERE cv.id = conversation_members.conversation_id AND cv.created_by = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.conversation_id = conversation_members.conversation_id
            AND c.is_public
            AND NOT EXISTS (
              SELECT 1 FROM public.community_moderation m
              WHERE m.community_id = c.id AND m.user_id = auth.uid() AND m.action = 'ban'
            )
        )
      )
    )
  );
