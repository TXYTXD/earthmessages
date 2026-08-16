-- The app sends sticker messages but the original check constraint didn't
-- include the type, so they were rejected by the database. Widen it.
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('text', 'image', 'file', 'gif', 'voice', 'sticker', 'system'));
