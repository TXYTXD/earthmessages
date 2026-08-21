-- Grant the verified badge to Orfeas Damoulianos' account
UPDATE public.profiles
SET is_verified = true
WHERE display_name ILIKE '%orfeas%' OR display_name ILIKE '%damoulian%';
