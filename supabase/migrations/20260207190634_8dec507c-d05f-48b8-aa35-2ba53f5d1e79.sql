-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Allow any authenticated user to create conversations
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);