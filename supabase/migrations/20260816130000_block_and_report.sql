-- User safety: blocking and reporting (required for Play Store UGC policy)

CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks: select" ON public.blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users manage own blocks: insert" ON public.blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users manage own blocks: delete" ON public.blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 50),
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can file reports; only the app owner (dashboard/service role) reads them
CREATE POLICY "Users can file reports" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id AND reporter_id <> reported_user_id);
