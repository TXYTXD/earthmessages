
-- Create starred_messages table
CREATE TABLE public.starred_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can star messages in their conversations"
ON public.starred_messages FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_conversation_member(auth.uid(), conversation_id));

CREATE POLICY "Users can view own starred messages"
ON public.starred_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can unstar own messages"
ON public.starred_messages FOR DELETE
USING (auth.uid() = user_id);
