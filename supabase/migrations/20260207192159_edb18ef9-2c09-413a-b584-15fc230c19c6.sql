
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Create a simpler INSERT policy that allows any authenticated user
CREATE POLICY "Anyone authenticated can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);
