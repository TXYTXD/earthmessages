-- Themes can also restyle individual parts of the app: per-element colours,
-- icons, sounds and animations chosen in the advanced editor.
ALTER TABLE public.custom_themes
  ADD COLUMN IF NOT EXISTS customization jsonb NOT NULL DEFAULT '{}'::jsonb;
