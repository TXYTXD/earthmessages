-- Drop the existing insert policy that's too restrictive
DROP POLICY "Authenticated users can create conversations" ON public.conversations;

-- Create a new policy that allows any authenticated user to create conversations
-- The created_by field is set by the client, so we just need to verify the user is authenticated
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);