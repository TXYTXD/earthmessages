
-- 1. Fix overly permissive conversations INSERT policy
DROP POLICY IF EXISTS "Anyone authenticated can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 2. Add missing DELETE policy for conversations (admin only)
CREATE POLICY "Admins can delete conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (is_conversation_admin(auth.uid(), id));

-- 3. Restrict profiles SELECT to own profile + friends + conversation members
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.is_friend_or_self(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT _viewer_id = _target_user_id
    OR EXISTS (
      SELECT 1 FROM public.friend_requests
      WHERE status = 'accepted'
        AND (
          (sender_id = _viewer_id AND receiver_id = _target_user_id)
          OR (receiver_id = _viewer_id AND sender_id = _target_user_id)
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_members cm1
      JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
      WHERE cm1.user_id = _viewer_id AND cm2.user_id = _target_user_id
    )
$$;

CREATE POLICY "Users can view own, friends, and conversation members profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_friend_or_self(auth.uid(), user_id));
