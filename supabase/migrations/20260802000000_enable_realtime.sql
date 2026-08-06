-- Ensure realtime events are broadcast for messaging and calling tables.
-- Safe to re-run: tables already in the publication are skipped.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'call_signaling','call_records','messages','typing_indicators',
    'message_reactions','user_status','message_read_receipts'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;
