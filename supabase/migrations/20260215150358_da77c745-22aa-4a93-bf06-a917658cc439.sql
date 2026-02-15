
-- Add permissive policy so authenticated users can search all profiles
CREATE POLICY "Authenticated users can search profiles"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);
