
-- Call records table for history
CREATE TABLE public.call_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL DEFAULT 'voice' CHECK (type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'answered', 'missed', 'declined', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Call signaling table for WebRTC
CREATE TABLE public.call_signaling (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.call_records(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice-candidate', 'hangup')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signaling ENABLE ROW LEVEL SECURITY;

-- RLS for call records
CREATE POLICY "Users can view own calls" ON public.call_records
  FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls" ON public.call_records
  FOR INSERT WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Call participants can update" ON public.call_records
  FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- RLS for signaling
CREATE POLICY "Participants can view signals" ON public.call_signaling
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.call_records WHERE id = call_id AND (caller_id = auth.uid() OR receiver_id = auth.uid()))
  );

CREATE POLICY "Participants can send signals" ON public.call_signaling
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM public.call_records WHERE id = call_id AND (caller_id = auth.uid() OR receiver_id = auth.uid()))
  );

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signaling;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_records;

-- Indexes
CREATE INDEX idx_call_records_caller ON public.call_records(caller_id, created_at DESC);
CREATE INDEX idx_call_records_receiver ON public.call_records(receiver_id, created_at DESC);
CREATE INDEX idx_call_signaling_call ON public.call_signaling(call_id, created_at);
