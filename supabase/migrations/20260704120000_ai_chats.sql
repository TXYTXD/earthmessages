-- Store each user's AI Assistant conversations so they can see previous chats
CREATE TABLE public.ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX ai_chats_user_id_updated_at_idx
  ON public.ai_chats (user_id, updated_at DESC);

ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai chats"
ON public.ai_chats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ai chats"
ON public.ai_chats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai chats"
ON public.ai_chats FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai chats"
ON public.ai_chats FOR DELETE
USING (auth.uid() = user_id);
