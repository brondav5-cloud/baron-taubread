-- ============================================================
-- Analytics retention automation + monitoring
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analytics_retention_settings (
  id boolean PRIMARY KEY DEFAULT true,
  monthly_months integer NOT NULL DEFAULT 36 CHECK (monthly_months BETWEEN 12 AND 60),
  weekly_weeks integer NOT NULL DEFAULT 78 CHECK (weekly_weeks BETWEEN 26 AND 156),
  daily_weeks integer NOT NULL DEFAULT 12 CHECK (daily_weeks BETWEEN 4 AND 52),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.analytics_retention_settings (
  id, monthly_months, weekly_weeks, daily_weeks, enabled
)
VALUES (true, 36, 78, 12, true)
ON CONFLICT (id) DO UPDATE
SET
  monthly_months = EXCLUDED.monthly_months,
  weekly_weeks = EXCLUDED.weekly_weeks,
  daily_weeks = EXCLUDED.daily_weeks,
  enabled = EXCLUDED.enabled,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.run_analytics_retention_job()
RETURNS TABLE(metric text, rows_affected bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_enabled boolean;
  v_monthly integer;
  v_weekly integer;
  v_daily integer;
BEGIN
  SELECT enabled, monthly_months, weekly_weeks, daily_weeks
  INTO v_enabled, v_monthly, v_weekly, v_daily
  FROM public.analytics_retention_settings
  WHERE id = true;

  IF COALESCE(v_enabled, false) = false THEN
    metric := 'retention_disabled';
    rows_affected := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT * FROM public.apply_analytics_retention(v_weekly, v_daily, v_monthly);
END;
$$;

CREATE OR REPLACE VIEW public.analytics_storage_overview AS
SELECT
  c.relname AS table_name,
  pg_total_relation_size(c.oid) AS total_bytes,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  pg_relation_size(c.oid) AS heap_bytes,
  pg_size_pretty(pg_relation_size(c.oid)) AS heap_size,
  pg_total_relation_size(c.oid) - pg_relation_size(c.oid) AS index_toast_bytes,
  pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) AS index_toast_size,
  COALESCE(s.n_live_tup, 0) AS est_live_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'store_product_weekly',
    'store_product_daily',
    'store_product_monthly_dist',
    'store_deliveries',
    'store_products',
    'stores',
    'products',
    'visits'
  )
ORDER BY pg_total_relation_size(c.oid) DESC;

DO $$
BEGIN
  -- Schedule monthly retention if pg_cron is enabled.
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'analytics_retention_monthly'
    ) THEN
      PERFORM cron.schedule(
        'analytics_retention_monthly',
        '15 2 1 * *',
        'SELECT * FROM public.run_analytics_retention_job();'
      );
    END IF;
  END IF;
END $$;
