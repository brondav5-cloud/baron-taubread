-- ============================================================
-- Upload Verification Functions
-- Two server-side aggregate functions that return exact totals
-- directly from the DB — no row limit, no client-side summing.
-- ============================================================

-- ============================================================
-- 1. verify_weekly_upload
--    Verifies store_product_weekly data for a date range.
--    Returns SUM(gross_qty), SUM(returns_qty), COUNT(*),
--    and COUNT(DISTINCT store_external_id) — all in one query.
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_weekly_upload(
  p_company_id  uuid,
  p_period_start date,
  p_period_end   date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_gross_qty',   COALESCE(SUM(gross_qty),   0),
    'total_returns_qty', COALESCE(SUM(returns_qty), 0),
    'records_count',     COUNT(*),
    'stores_count',      COUNT(DISTINCT store_external_id)
  )
  FROM public.store_product_weekly
  WHERE company_id      = p_company_id
    AND week_start_date >= p_period_start
    AND week_start_date <= p_period_end;
$$;

GRANT EXECUTE ON FUNCTION public.verify_weekly_upload(uuid, date, date)
  TO authenticated, service_role;


-- ============================================================
-- 2. verify_monthly_upload
--    Verifies store_products data for a set of month keys.
--    Receives a JSON array of month strings (e.g. ["2026-01","2026-02"]).
--    Sums the values for ONLY those months from the JSONB columns.
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_monthly_upload(
  p_company_id uuid,
  p_months     jsonb   -- e.g. '["2026-01","2026-02"]'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_gross   numeric := 0;
  v_total_returns numeric := 0;
  v_total_net_qty numeric := 0;
  v_total_sales   numeric := 0;
  v_stores_count  integer := 0;
  v_products_count integer := 0;
  v_month         text;
BEGIN
  -- Sum monthly_gross and monthly_returns from stores table for uploaded months
  FOR v_month IN SELECT jsonb_array_elements_text(p_months) LOOP
    SELECT
      v_total_gross   + COALESCE((monthly_gross   ->> v_month)::numeric, 0),
      v_total_returns + COALESCE((monthly_returns ->> v_month)::numeric, 0)
    INTO v_total_gross, v_total_returns
    FROM (
      SELECT
        SUM((monthly_gross   ->> v_month)::numeric) AS monthly_gross,
        SUM((monthly_returns ->> v_month)::numeric) AS monthly_returns
      FROM public.stores
      WHERE company_id = p_company_id
    ) sub;
  END LOOP;

  -- Count distinct stores and products that have data for any of the uploaded months
  SELECT COUNT(DISTINCT s.external_id)
  INTO v_stores_count
  FROM public.stores s
  WHERE s.company_id = p_company_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(p_months) AS m(month_key)
      WHERE (s.monthly_gross ->> m.month_key) IS NOT NULL
    );

  SELECT COUNT(DISTINCT p.external_id)
  INTO v_products_count
  FROM public.products p
  WHERE p.company_id = p_company_id;

  -- Sum monthly_qty and monthly_sales from store_products for uploaded months
  FOR v_month IN SELECT jsonb_array_elements_text(p_months) LOOP
    SELECT
      v_total_net_qty + COALESCE((monthly_qty   ->> v_month)::numeric, 0),
      v_total_sales   + COALESCE((monthly_sales ->> v_month)::numeric, 0)
    INTO v_total_net_qty, v_total_sales
    FROM (
      SELECT
        SUM((monthly_qty   ->> v_month)::numeric) AS monthly_qty,
        SUM((monthly_sales ->> v_month)::numeric) AS monthly_sales
      FROM public.store_products
      WHERE company_id = p_company_id
    ) sub;
  END LOOP;

  RETURN jsonb_build_object(
    'total_gross_qty',   v_total_gross,
    'total_returns_qty', v_total_returns,
    'total_net_qty',     v_total_net_qty,
    'total_sales',       v_total_sales,
    'stores_count',      v_stores_count,
    'products_count',    v_products_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_monthly_upload(uuid, jsonb)
  TO authenticated, service_role;
