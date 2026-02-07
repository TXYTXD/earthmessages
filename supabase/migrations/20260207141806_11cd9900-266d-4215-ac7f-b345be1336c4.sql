
-- Create a security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Create a security definer function to check conversation admin role
CREATE OR REPLACE FUNCTION public.is_conversation_admin(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE user_id = _user_id AND conversation_id = _conversation_id AND role = 'admin'
  )
$$;

-- Fix conversation_members policies
DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;
CREATE POLICY "Members can view conversation members" ON public.conversation_members
  FOR SELECT USING (public.is_conversation_member(auth.uid(), conversation_id));

DROP POLICY IF EXISTS "Admins can remove members" ON public.conversation_members;
CREATE POLICY "Admins can remove members" ON public.conversation_members
  FOR DELETE USING (
    user_id = auth.uid() 
    OR public.is_conversation_admin(auth.uid(), conversation_id)
  );

DROP POLICY IF EXISTS "Users can add members to conversations" ON public.conversation_members;
CREATE POLICY "Users can add members to conversations" ON public.conversation_members
  FOR INSERT WITH CHECK (
    public.is_conversation_admin(auth.uid(), conversation_id)
    OR user_id = auth.uid()
  );

-- Fix conversations policies
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT USING (public.is_conversation_member(auth.uid(), id));

DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;
CREATE POLICY "Admins can update conversations" ON public.conversations
  FOR UPDATE USING (public.is_conversation_admin(auth.uid(), id));
