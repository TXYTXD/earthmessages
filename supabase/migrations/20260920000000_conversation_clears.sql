-- "Clear chat" hides a conversation's history for one person.
--
-- It deliberately does not delete the messages: the other person's copy is
-- theirs, and clearing your own view should never reach into their account.
-- Instead we record when you cleared, and hide anything older for you.

CREATE TABLE public.conversation_clears (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  cleared_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

ALTER TABLE public.conversation_clears ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own clears" ON public.conversation_clears
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users set own clears" ON public.conversation_clears
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own clears" ON public.conversation_clears
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own clears" ON public.conversation_clears
  FOR DELETE USING (auth.uid() = user_id);
