-- Themes can carry motion, an animated background and ambient sound.
ALTER TABLE public.custom_themes
  ADD COLUMN IF NOT EXISTS effects jsonb NOT NULL DEFAULT '{}'::jsonb;
