-- Theme Market: user-made themes that can be published and added by anyone.
-- Published themes are permanent: there is no DELETE policy, so nothing
-- anyone has added can ever disappear from under them.

CREATE TABLE public.custom_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT '',
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  definition jsonb NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  installs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public and own themes are visible" ON public.custom_themes
  FOR SELECT USING (is_public OR author_id = auth.uid());
CREATE POLICY "Users publish own themes" ON public.custom_themes
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can rename own themes" ON public.custom_themes
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE INDEX custom_themes_public_idx ON public.custom_themes (is_public, installs DESC, created_at DESC);

-- Themes a user has added to their collection
CREATE TABLE public.theme_installs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.custom_themes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, theme_id)
);

ALTER TABLE public.theme_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own installs" ON public.theme_installs
  FOR SELECT USING (auth.uid() = user_id);

-- Add / remove via functions so the public install counter stays accurate
CREATE OR REPLACE FUNCTION public.install_theme(p_theme uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.custom_themes WHERE id = p_theme AND (is_public OR author_id = auth.uid())) THEN
    RAISE EXCEPTION 'theme not available';
  END IF;
  INSERT INTO public.theme_installs (user_id, theme_id) VALUES (auth.uid(), p_theme)
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    UPDATE public.custom_themes SET installs = installs + 1 WHERE id = p_theme;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.uninstall_theme(p_theme uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  DELETE FROM public.theme_installs WHERE user_id = auth.uid() AND theme_id = p_theme;
  IF FOUND THEN
    UPDATE public.custom_themes SET installs = GREATEST(installs - 1, 0) WHERE id = p_theme;
  END IF;
END;
$$;
