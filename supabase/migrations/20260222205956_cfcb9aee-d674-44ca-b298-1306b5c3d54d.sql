
-- Add pin_hash column to profiles table
ALTER TABLE public.profiles ADD COLUMN pin_hash text DEFAULT NULL;
