-- Security hardening

-- ai_chats: prevent reassigning rows to another user on update
DROP POLICY IF EXISTS "Users can update own ai chats" ON public.ai_chats;
CREATE POLICY "Users can update own ai chats"
ON public.ai_chats FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Calls: only friends can ring each other (blocks stranger call spam)
DROP POLICY IF EXISTS "Users can create calls" ON public.call_records;
CREATE POLICY "Users can create calls" ON public.call_records
  FOR INSERT WITH CHECK (
    auth.uid() = caller_id
    AND caller_id <> receiver_id
    AND EXISTS (
      SELECT 1 FROM public.friend_requests
      WHERE status = 'accepted'
        AND ((sender_id = auth.uid() AND receiver_id = call_records.receiver_id)
          OR (receiver_id = auth.uid() AND sender_id = call_records.receiver_id))
    )
  );

-- Storage: uploads only into the uploader's own folder
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
CREATE POLICY "Authenticated users can upload stories" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]
  );
