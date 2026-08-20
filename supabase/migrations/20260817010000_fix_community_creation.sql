-- Fix community creation: the creator inserts the backing conversation and
-- immediately needs it returned (and referenced in membership/community
-- policies), but "Members can view conversations" only covers members —
-- and the creator isn't a member yet at that moment. Without SELECT
-- access the INSERT ... RETURNING fails and creation rolls back.
CREATE POLICY "Creators can view own conversations" ON public.conversations
  FOR SELECT USING (created_by = auth.uid());
