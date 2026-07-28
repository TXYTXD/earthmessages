-- Add a verified flag to user profiles (blue checkmark badge)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
