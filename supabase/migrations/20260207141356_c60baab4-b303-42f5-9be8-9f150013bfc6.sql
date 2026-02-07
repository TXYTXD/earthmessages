
-- 1. Fix profiles: require authentication for search
DROP POLICY IF EXISTS "Users can search profiles" ON public.profiles;
CREATE POLICY "Authenticated users can search profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Remove redundant policy (the new one covers it)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- 2. Fix user_status: restrict to self + friends only
DROP POLICY IF EXISTS "Anyone can view status" ON public.user_status;
CREATE POLICY "Users and friends can view status" ON public.user_status
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM friend_requests
        WHERE status = 'accepted'
        AND ((sender_id = auth.uid() AND receiver_id = user_status.user_id)
          OR (receiver_id = auth.uid() AND sender_id = user_status.user_id))
      )
    )
  );

-- 3. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('chat-media', 'stories');

-- 4. Update storage SELECT policies to require auth
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view stories" ON storage.objects;
DROP POLICY IF EXISTS "Public can view stories" ON storage.objects;

CREATE POLICY "Authenticated users can view chat media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-media' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can view stories" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'stories' AND auth.uid() IS NOT NULL
  );

-- 5. Add rate limiting on friend requests (max 10 pending per hour)
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_requests;
CREATE POLICY "Users can send friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> receiver_id
    AND (
      SELECT COUNT(*) FROM friend_requests
      WHERE sender_id = auth.uid()
      AND created_at > NOW() - INTERVAL '1 hour'
    ) < 10
  );
