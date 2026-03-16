-- =============================================
-- Lightweight user activity monitoring (opt-in per user)
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_activity_tracked_users (
  user_id text PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT true,
  added_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_activity_events (
  id bigserial PRIMARY KEY,
  company_id text,
  user_id text NOT NULL,
  event_type text NOT NULL,
  route text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_events_user_created
  ON public.user_activity_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_events_company_created
  ON public.user_activity_events (company_id, created_at DESC);

ALTER TABLE public.user_activity_tracked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_tracked_users" ON public.user_activity_tracked_users;
CREATE POLICY "deny_all_tracked_users" ON public.user_activity_tracked_users
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_activity_events" ON public.user_activity_events;
CREATE POLICY "deny_all_activity_events" ON public.user_activity_events
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- Optional bootstrap for the 3 tracked users requested by email.
-- Safe to run repeatedly.
INSERT INTO public.user_activity_tracked_users (user_id, is_active)
SELECT u.id, true
FROM public.users u
WHERE lower(u.email) IN (
  'dvirku1979@gmail.com',
  'taleliyaho@gmail.com',
  'nickol.taubread@gmail.com'
)
ON CONFLICT (user_id) DO UPDATE SET
  is_active = true,
  updated_at = now();
