
-- Enable pgcrypto for bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. New user_pins table
CREATE TABLE IF NOT EXISTS public.user_pins (
  user_id uuid PRIMARY KEY,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own pin"
  ON public.user_pins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own pin"
  ON public.user_pins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own pin"
  ON public.user_pins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own pin"
  ON public.user_pins FOR DELETE
  USING (auth.uid() = user_id);

-- Migrate existing pin hashes (legacy SHA-256 - users will need to re-set their PIN to upgrade to bcrypt)
INSERT INTO public.user_pins (user_id, pin_hash)
SELECT user_id, pin_hash FROM public.profiles WHERE pin_hash IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 2. Drop pin_hash from profiles (no longer exposed via broad search policy)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS pin_hash;

-- 3. Server-side PIN management with bcrypt
CREATE OR REPLACE FUNCTION public.set_user_pin(_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _pin IS NULL OR length(_pin) < 4 OR length(_pin) > 12 THEN
    RAISE EXCEPTION 'Invalid PIN';
  END IF;

  INSERT INTO public.user_pins (user_id, pin_hash, updated_at)
  VALUES (_uid, extensions.crypt(_pin, extensions.gen_salt('bf', 10)), now())
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_user_pin(_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _uid uuid := auth.uid();
  _hash text;
BEGIN
  IF _uid IS NULL OR _pin IS NULL THEN
    RETURN false;
  END IF;
  SELECT pin_hash INTO _hash FROM public.user_pins WHERE user_id = _uid;
  IF _hash IS NULL THEN
    RETURN false;
  END IF;
  -- bcrypt hashes start with $2; legacy SHA-256 hashes won't match (user must re-set PIN)
  IF _hash LIKE '$2%' THEN
    RETURN extensions.crypt(_pin, _hash) = _hash;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_pin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_pins WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.set_user_pin(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_user_pin(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_has_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_pin() TO authenticated;

-- 4. Tighten message_reactions INSERT to require conversation membership
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cm.user_id = auth.uid()
    )
  );

-- 5. Tighten storage policies on chat-media and stories buckets (owner folder only).
-- Sharing across users uses signed URLs, which bypass RLS, so this won't break sharing.
DROP POLICY IF EXISTS "Authenticated users can read chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat media" ON storage.objects;

CREATE POLICY "Users can read own chat media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own chat media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can read stories" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view stories" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own stories" ON storage.objects;

CREATE POLICY "Users can read own stories"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'stories'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own stories"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'stories'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own stories"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'stories'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
