
-- Create scheduled_messages table
CREATE TABLE public.scheduled_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  media_url text,
  media_metadata jsonb,
  type text NOT NULL DEFAULT 'text',
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  scheduled_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own scheduled messages
CREATE POLICY "Users can view own scheduled messages"
ON public.scheduled_messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id);

-- Users can create scheduled messages in conversations they belong to
CREATE POLICY "Users can create scheduled messages"
ON public.scheduled_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND is_conversation_member(auth.uid(), conversation_id)
);

-- Users can update their own pending scheduled messages
CREATE POLICY "Users can update own scheduled messages"
ON public.scheduled_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id AND status = 'pending');

-- Users can delete their own pending scheduled messages
CREATE POLICY "Users can delete own scheduled messages"
ON public.scheduled_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id AND status = 'pending');

-- Enable pg_cron and pg_net extensions for the cron job
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
