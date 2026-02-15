
-- Drop all existing RESTRICTIVE policies on call_records
DROP POLICY IF EXISTS "Users can view own calls" ON public.call_records;
DROP POLICY IF EXISTS "Users can create calls" ON public.call_records;
DROP POLICY IF EXISTS "Call participants can update" ON public.call_records;

-- Recreate as PERMISSIVE
CREATE POLICY "Users can view own calls" ON public.call_records
  FOR SELECT TO authenticated
  USING ((auth.uid() = caller_id) OR (auth.uid() = receiver_id));

CREATE POLICY "Users can create calls" ON public.call_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Call participants can update" ON public.call_records
  FOR UPDATE TO authenticated
  USING ((auth.uid() = caller_id) OR (auth.uid() = receiver_id));

-- Drop all existing RESTRICTIVE policies on call_signaling
DROP POLICY IF EXISTS "Participants can view signals" ON public.call_signaling;
DROP POLICY IF EXISTS "Participants can send signals" ON public.call_signaling;

-- Recreate as PERMISSIVE
CREATE POLICY "Participants can view signals" ON public.call_signaling
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM call_records
    WHERE call_records.id = call_signaling.call_id
      AND (call_records.caller_id = auth.uid() OR call_records.receiver_id = auth.uid())
  ));

CREATE POLICY "Participants can send signals" ON public.call_signaling
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM call_records
      WHERE call_records.id = call_signaling.call_id
        AND (call_records.caller_id = auth.uid() OR call_records.receiver_id = auth.uid())
    )
  );
