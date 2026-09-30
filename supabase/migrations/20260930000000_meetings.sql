-- Meetings: a room several people can be in at once, reached by a short code.
--
-- Unlike a one-to-one call, nobody rings anybody. A meeting exists, it has a
-- link, and whoever has the link and an account can walk in. That means the
-- code IS the key to the room, so a meeting must not be readable by anyone
-- who has not been let in — which is why looking one up goes through
-- join_meeting() below rather than a plain SELECT.

CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Short, readable, and the only way in: "ums-4f7k-9qp"
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9-]{6,32}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- NULL means "open now, no set time"
  starts_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX meetings_host_idx ON public.meetings (host_id, created_at DESC);
CREATE INDEX meetings_starts_idx ON public.meetings (starts_at) WHERE ended_at IS NULL;

CREATE TABLE public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  -- Browsers do not reliably tell the server when a tab closes, so presence
  -- is a heartbeat: a row that has stopped being touched is treated as gone.
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, user_id)
);

CREATE INDEX meeting_participants_meeting_idx ON public.meeting_participants (meeting_id, last_seen DESC);

-- One row per WebRTC message, addressed to one person. A meeting is a mesh:
-- everyone holds a connection to everyone else, so every signal names who it
-- is for rather than being broadcast to the room.
CREATE TABLE public.meeting_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('offer', 'answer', 'ice-candidate', 'leave')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX meeting_signals_inbox_idx ON public.meeting_signals (receiver_id, created_at);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_signals ENABLE ROW LEVEL SECURITY;

-- Avoids a policy on meeting_participants that reads meeting_participants.
CREATE OR REPLACE FUNCTION public.is_in_meeting(p_meeting uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_participants
    WHERE meeting_id = p_meeting AND user_id = p_user
  );
$$;

-- ---------------------------------------------------------------- meetings
-- You can see a meeting you host, or one you have been let into. There is
-- deliberately no "select by code" policy: the code is the key, and handing
-- it over goes through join_meeting().
CREATE POLICY "Hosts and participants can view a meeting" ON public.meetings
  FOR SELECT USING (
    auth.uid() = host_id OR public.is_in_meeting(id, auth.uid())
  );

CREATE POLICY "Users can create their own meetings" ON public.meetings
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can change their meetings" ON public.meetings
  FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their meetings" ON public.meetings
  FOR DELETE USING (auth.uid() = host_id);

-- ------------------------------------------------------------ participants
CREATE POLICY "Participants can see who else is here" ON public.meeting_participants
  FOR SELECT USING (public.is_in_meeting(meeting_id, auth.uid()));

CREATE POLICY "Users can add themselves" ON public.meeting_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own row" ON public.meeting_participants
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------- signals
-- You only ever read what was addressed to you.
CREATE POLICY "Read signals addressed to me" ON public.meeting_signals
  FOR SELECT USING (auth.uid() = receiver_id);

CREATE POLICY "Send signals into a meeting you are in" ON public.meeting_signals
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND public.is_in_meeting(meeting_id, auth.uid())
    AND public.is_in_meeting(meeting_id, receiver_id)
  );

-- -------------------------------------------------------------- joining in
-- The only way to turn a code into a meeting. It checks the room is still
-- open, puts the caller in it, and hands back the row — so a code that does
-- not exist is indistinguishable from one that does but has ended, and
-- nobody can list or guess their way into other people's rooms.
CREATE OR REPLACE FUNCTION public.join_meeting(p_code text)
RETURNS public.meetings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.meetings;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to join a meeting';
  END IF;

  SELECT * INTO m
  FROM public.meetings
  WHERE code = lower(btrim(p_code)) AND ended_at IS NULL;

  IF m.id IS NULL THEN
    RAISE EXCEPTION 'That meeting does not exist, or it has already finished';
  END IF;

  INSERT INTO public.meeting_participants (meeting_id, user_id)
  VALUES (m.id, uid)
  ON CONFLICT (meeting_id, user_id)
  DO UPDATE SET left_at = NULL, last_seen = now(), joined_at = now();

  RETURN m;
END;
$$;

REVOKE ALL ON FUNCTION public.join_meeting(text) FROM public;
GRANT EXECUTE ON FUNCTION public.join_meeting(text) TO authenticated;

-- Signals pile up fast (one row per ICE candidate). Nothing needs them once
-- the connection is up, so a meeting's own page prunes as it goes; this is
-- the backstop for rooms nobody came back to.
CREATE OR REPLACE FUNCTION public.prune_meeting_signals()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.meeting_signals WHERE created_at < now() - interval '2 hours';
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_signals;
