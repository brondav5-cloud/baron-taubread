-- ============================================================
-- Analytics retention policy (safe scope)
-- Monthly: 36 months
-- Weekly:  78 weeks
-- Daily:   12 weeks
-- IMPORTANT: Does NOT touch visits / visit photos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prune_monthly_jsonb(
  p_data jsonb,
  p_cutoff_month_start date
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  WITH kv AS (
    SELECT key, value
    FROM jsonb_each(COALESCE(p_data, '{}'::jsonb))
  ),
  kept AS (
    SELECT key, value
    FROM kv
    WHERE
      -- Keep unknown key formats to avoid accidental data loss.
      (
        key !~ '^\d{4}-\d{1,2}$'
        AND key !~ '^\d{6}$'
      )
      OR (
        CASE
          WHEN key ~ '^\d{6}$'
            THEN to_date(key || '01', 'YYYYMMDD')
          ELSE to_date(split_part(key, '-', 1) || '-' || lpad(split_part(key, '-', 2), 2, '0') || '-01', 'YYYY-MM-DD')
        END
      ) >= p_cutoff_month_start
  )
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM kept;
$$;

CREATE OR REPLACE FUNCTION public.apply_analytics_retention(
  p_weekly_weeks integer DEFAULT 78,
  p_daily_weeks integer DEFAULT 12,
  p_monthly_months integer DEFAULT 36
)
RETURNS TABLE(metric text, rows_affected bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekly_cutoff date := (current_date - make_interval(weeks => p_weekly_weeks));
  v_daily_cutoff date := (current_date - make_interval(weeks => p_daily_weeks));
  v_monthly_cutoff date := (date_trunc('month', current_date) - make_interval(months => p_monthly_months))::date;
  v_rows bigint;
BEGIN
  DELETE FROM public.store_product_weekly
  WHERE week_start_date < v_weekly_cutoff;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  metric := 'store_product_weekly_deleted';
  rows_affected := v_rows;
  RETURN NEXT;

  DELETE FROM public.store_product_daily
  WHERE week_start_date < v_daily_cutoff;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  metric := 'store_product_daily_deleted';
  rows_affected := v_rows;
  RETURN NEXT;

  DELETE FROM public.store_product_monthly_dist
  WHERE make_date(year, month, 1) < v_monthly_cutoff;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  metric := 'store_product_monthly_dist_deleted';
  rows_affected := v_rows;
  RETURN NEXT;

  DELETE FROM public.store_deliveries
  WHERE make_date(year, month, 1) < v_monthly_cutoff;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  metric := 'store_deliveries_deleted';
  rows_affected := v_rows;
  RETURN NEXT;

  UPDATE public.stores
  SET
    monthly_qty = public.prune_monthly_jsonb(monthly_qty, v_monthly_cutoff),
    monthly_sales = public.prune_monthly_jsonb(monthly_sales, v_monthly_cutoff),
    monthly_gross = public.prune_monthly_jsonb(monthly_gross, v_monthly_cutoff),
    monthly_returns = public.prune_monthly_jsonb(monthly_returns, v_monthly_cutoff)
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_object_keys(COALESCE(stores.monthly_qty, '{}'::jsonb)) AS k(key)
    WHERE (
      CASE
        WHEN key ~ '^\d{6}$' THEN to_date(key || '01', 'YYYYMMDD')
        WHEN key ~ '^\d{4}-\d{1,2}$' THEN to_date(split_part(key, '-', 1) || '-' || lpad(split_part(key, '-', 2), 2, '0') || '-01', 'YYYY-MM-DD')
        ELSE NULL
      END
    ) < v_monthly_cutoff
  );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  metric := 'stores_monthly_json_trimmed';
  rows_affected := v_rows;
  RETURN NEXT;

  UPDATE public.products
  SET
    monthly_qty = public.prune_monthly_jsonb(monthly_qty, v_monthly_cutoff),
    monthly_sales = public.prune_monthly_jsonb(monthly_sales, v_monthly_cutoff)
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_object_keys(COALESCE(products.monthly_qty, '{}'::jsonb)) AS k(key)
    WHERE (
      CASE
        WHEN key ~ '^\d{6}$' THEN to_date(key || '01', 'YYYYMMDD')
        WHEN key ~ '^\d{4}-\d{1,2}$' THEN to_date(split_part(key, '-', 1) || '-' || lpad(split_part(key, '-', 2), 2, '0') || '-01', 'YYYY-MM-DD')
        ELSE NULL
      END
    ) < v_monthly_cutoff
  );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  metric := 'products_monthly_json_trimmed';
  rows_affected := v_rows;
  RETURN NEXT;

  UPDATE public.store_products
  SET
    monthly_qty = public.prune_monthly_jsonb(monthly_qty, v_monthly_cutoff),
    monthly_sales = public.prune_monthly_jsonb(monthly_sales, v_monthly_cutoff),
    monthly_returns = public.prune_monthly_jsonb(monthly_returns, v_monthly_cutoff)
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_object_keys(COALESCE(store_products.monthly_qty, '{}'::jsonb)) AS k(key)
    WHERE (
      CASE
        WHEN key ~ '^\d{6}$' THEN to_date(key || '01', 'YYYYMMDD')
        WHEN key ~ '^\d{4}-\d{1,2}$' THEN to_date(split_part(key, '-', 1) || '-' || lpad(split_part(key, '-', 2), 2, '0') || '-01', 'YYYY-MM-DD')
        ELSE NULL
      END
    ) < v_monthly_cutoff
  );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  metric := 'store_products_monthly_json_trimmed';
  rows_affected := v_rows;
  RETURN NEXT;
END;
$$;

-- Run separately after migration to avoid migration timeouts.
