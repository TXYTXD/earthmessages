-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Recreate as PERMISSIVE (the default) so it actually grants access
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix SELECT and UPDATE to be permissive
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (is_conversation_member(auth.uid(), id));

DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;
CREATE POLICY "Admins can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (is_conversation_admin(auth.uid(), id));

-- Fix conversation_members policies to be permissive too
DROP POLICY IF EXISTS "Users can add members to conversations" ON public.conversation_members;
CREATE POLICY "Users can add members to conversations"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (is_conversation_admin(auth.uid(), conversation_id) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;
CREATE POLICY "Members can view conversation members"
ON public.conversation_members
FOR SELECT
TO authenticated
USING (is_conversation_member(auth.uid(), conversation_id));

DROP POLICY IF EXISTS "Users can update own membership" ON public.conversation_members;
CREATE POLICY "Users can update own membership"
ON public.conversation_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can remove members" ON public.conversation_members;
CREATE POLICY "Admins can remove members"
ON public.conversation_members
FOR DELETE
TO authenticated
USING ((user_id = auth.uid()) OR is_conversation_admin(auth.uid(), conversation_id));

-- Fix messages policies to be permissive
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Senders can update own messages" ON public.messages;
CREATE POLICY "Senders can update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Senders can delete own messages" ON public.messages;
CREATE POLICY "Senders can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);