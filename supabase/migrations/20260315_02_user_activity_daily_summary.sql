-- =============================================
-- Daily dry summary for user activity monitoring
-- Keeps reporting lightweight and stable.
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_activity_daily_summary (
  activity_date date NOT NULL,
  company_id text,
  user_id text NOT NULL,
  login_count integer NOT NULL DEFAULT 0,
  page_views integer NOT NULL DEFAULT 0,
  heartbeat_count integer NOT NULL DEFAULT 0,
  active_minutes integer NOT NULL DEFAULT 0,
  last_route text,
  last_seen_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_activity_daily_summary_company_date
  ON public.user_activity_daily_summary (company_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_daily_summary_user_date
  ON public.user_activity_daily_summary (user_id, activity_date DESC);

ALTER TABLE public.user_activity_daily_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_activity_daily_summary" ON public.user_activity_daily_summary;
CREATE POLICY "deny_all_activity_daily_summary" ON public.user_activity_daily_summary
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.upsert_user_activity_daily_summary(
  p_company_id text,
  p_user_id text,
  p_event_type text,
  p_route text,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_activity_daily_summary (
    activity_date,
    company_id,
    user_id,
    login_count,
    page_views,
    heartbeat_count,
    active_minutes,
    last_route,
    last_seen_at,
    updated_at
  )
  VALUES (
    CURRENT_DATE,
    p_company_id,
    p_user_id,
    CASE WHEN p_event_type = 'login' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'page_view' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'heartbeat' THEN 1 ELSE 0 END,
    CASE
      WHEN p_is_active IS TRUE AND p_event_type IN ('page_view', 'heartbeat')
      THEN 1
      ELSE 0
    END,
    p_route,
    now(),
    now()
  )
  ON CONFLICT (activity_date, user_id)
  DO UPDATE SET
    login_count = user_activity_daily_summary.login_count
      + CASE WHEN p_event_type = 'login' THEN 1 ELSE 0 END,
    page_views = user_activity_daily_summary.page_views
      + CASE WHEN p_event_type = 'page_view' THEN 1 ELSE 0 END,
    heartbeat_count = user_activity_daily_summary.heartbeat_count
      + CASE WHEN p_event_type = 'heartbeat' THEN 1 ELSE 0 END,
    active_minutes = user_activity_daily_summary.active_minutes
      + CASE
          WHEN p_is_active IS TRUE AND p_event_type IN ('page_view', 'heartbeat')
          THEN 1
          ELSE 0
        END,
    last_route = COALESCE(p_route, user_activity_daily_summary.last_route),
    last_seen_at = now(),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_user_activity_daily_summary(text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_user_activity_daily_summary(text, text, text, text, boolean) TO service_role;
