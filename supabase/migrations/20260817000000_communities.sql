-- Communities: public group spaces anyone can discover and join.
-- Each community is backed by a regular group conversation, so chatting,
-- media, reactions, and calls all reuse the existing machinery.

CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  emoji text NOT NULL DEFAULT '🌍' CHECK (char_length(emoji) <= 8),
  owner_id uuid NOT NULL,
  conversation_id uuid NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public communities are visible" ON public.communities
  FOR SELECT USING (is_public OR owner_id = auth.uid());

CREATE POLICY "Users can create communities" ON public.communities
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.conversations cv
      WHERE cv.id = conversation_id AND cv.created_by = auth.uid()
    )
  );

CREATE POLICY "Owners can update communities" ON public.communities
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete communities" ON public.communities
  FOR DELETE USING (auth.uid() = owner_id);

-- Tighten membership inserts: previously ANY user could add themselves to
-- ANY conversation they knew the id of. Now self-insert is allowed only
-- for the conversation's creator (group setup) or to join a public
-- community. Admin-adds and the service role are unaffected.
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
          WHERE c.conversation_id = conversation_members.conversation_id AND c.is_public
        )
      )
    )
  );

-- Group creators can delete their group conversations (used when a
-- community owner deletes the community). There was no DELETE policy
-- on conversations before, so deletes silently did nothing.
CREATE POLICY "Group creators can delete conversations" ON public.conversations
  FOR DELETE USING (created_by = auth.uid() AND type = 'group');

-- Member counts for the discovery list (non-members can't read the
-- members table directly, so expose only the aggregate).
CREATE OR REPLACE FUNCTION public.community_member_counts()
RETURNS TABLE (community_id uuid, member_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, COUNT(m.id)::bigint
  FROM public.communities c
  LEFT JOIN public.conversation_members m ON m.conversation_id = c.conversation_id
  WHERE c.is_public
  GROUP BY c.id;
$$;

REVOKE ALL ON FUNCTION public.community_member_counts() FROM public;
GRANT EXECUTE ON FUNCTION public.community_member_counts() TO authenticated;
