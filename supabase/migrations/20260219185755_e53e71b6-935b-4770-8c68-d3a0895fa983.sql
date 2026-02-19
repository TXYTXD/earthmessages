
-- Table to store per-conversation encryption keys (only accessible by members)
CREATE TABLE public.conversation_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  encryption_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id)
);

-- Enable RLS
ALTER TABLE public.conversation_keys ENABLE ROW LEVEL SECURITY;

-- Only conversation members can view the key
CREATE POLICY "Members can view conversation keys"
ON public.conversation_keys
FOR SELECT
USING (is_conversation_member(auth.uid(), conversation_id));

-- Only conversation members can insert keys
CREATE POLICY "Members can insert conversation keys"
ON public.conversation_keys
FOR INSERT
WITH CHECK (is_conversation_member(auth.uid(), conversation_id));
