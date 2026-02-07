
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Create a permissive INSERT policy for any authenticated user
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create a trigger to auto-set created_by to the current user
CREATE OR REPLACE FUNCTION public.set_conversation_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_conversation_created_by_trigger
BEFORE INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_conversation_created_by();
