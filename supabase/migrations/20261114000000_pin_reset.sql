-- Forgot your PIN? Reset it by proving you own the account's email.
--
-- The flow:
--   1. On the PIN screen, "Forgot PIN?" calls request_pin_reset(), which
--      notes that this account asked for a reset, and the app has Supabase
--      email a sign-in link to the account's address.
--   2. Clicking that link signs the person in. Supabase stamps the new
--      session's token with how it was made: amr = [{ method: "otp", ... }].
--   3. The reset page calls reset_pin_from_email(new_pin). It only works
--      when this session came from an email link AFTER the request, and
--      within 30 minutes of it. Knowing the page's address is not enough.

CREATE TABLE IF NOT EXISTS public.pin_reset_requests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now()
);

-- Nobody reads or writes this table directly; only the functions below do.
ALTER TABLE public.pin_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.request_pin_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  INSERT INTO public.pin_reset_requests (user_id, requested_at)
  VALUES (_uid, now())
  ON CONFLICT (user_id) DO UPDATE SET requested_at = now();
END;
$$;

-- Was this session created by clicking an emailed link, after the request?
CREATE OR REPLACE FUNCTION public.can_reset_pin_from_email()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _asked timestamptz;
  _amr jsonb := COALESCE(auth.jwt() -> 'amr', '[]'::jsonb);
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT requested_at INTO _asked FROM public.pin_reset_requests WHERE user_id = _uid;
  IF _asked IS NULL OR _asked < now() - interval '30 minutes' THEN
    RETURN false;
  END IF;

  -- An email link shows up as "otp" (older projects say "magiclink"). Its
  -- timestamp is when the link was used, in seconds since 1970.
  RETURN EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_amr) AS entry
    WHERE entry ->> 'method' IN ('otp', 'magiclink', 'email/signup')
      AND to_timestamp((entry ->> 'timestamp')::double precision) >= _asked
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_pin_from_email(_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF NOT public.can_reset_pin_from_email() THEN
    RAISE EXCEPTION 'This reset link has expired or was not opened from the email';
  END IF;
  IF _pin IS NULL OR _pin !~ '^[0-9]{4,12}$' THEN
    RAISE EXCEPTION 'Invalid PIN';
  END IF;

  INSERT INTO public.user_pins (user_id, pin_hash, updated_at)
  VALUES (_uid, extensions.crypt(_pin, extensions.gen_salt('bf', 10)), now())
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash, updated_at = now();

  -- One link, one reset.
  DELETE FROM public.pin_reset_requests WHERE user_id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.request_pin_reset() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_reset_pin_from_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_pin_from_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_pin_reset() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_reset_pin_from_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_pin_from_email(text) TO authenticated;
