-- ============================================================
-- Fix verify_monthly_upload: support both key formats
--   "YYYYMM"  (e.g. "202601")  — used by excelRowAggregator
--   "YYYY-MM" (e.g. "2026-01") — normalized format
-- The JSONB lookup now tries both formats via COALESCE.
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
  v_total_gross    numeric := 0;
  v_total_returns  numeric := 0;
  v_total_net_qty  numeric := 0;
  v_total_sales    numeric := 0;
  v_stores_count   integer := 0;
  v_products_count integer := 0;
  v_month          text;
  v_month_compact  text;   -- "YYYYMM" (no dash)
  v_gross_sum      numeric;
  v_returns_sum    numeric;
  v_qty_sum        numeric;
  v_sales_sum      numeric;
BEGIN
  FOR v_month IN SELECT jsonb_array_elements_text(p_months) LOOP
    -- Support both "2026-01" and "202601" key formats
    v_month_compact := replace(v_month, '-', '');

    -- stores: monthly_gross + monthly_returns
    SELECT
      COALESCE(SUM(COALESCE((monthly_gross   ->> v_month)::numeric,
                             (monthly_gross   ->> v_month_compact)::numeric, 0)), 0),
      COALESCE(SUM(COALESCE((monthly_returns ->> v_month)::numeric,
                             (monthly_returns ->> v_month_compact)::numeric, 0)), 0)
    INTO v_gross_sum, v_returns_sum
    FROM public.stores
    WHERE company_id = p_company_id;

    v_total_gross   := v_total_gross   + v_gross_sum;
    v_total_returns := v_total_returns + v_returns_sum;

    -- store_products: monthly_qty + monthly_sales
    SELECT
      COALESCE(SUM(COALESCE((monthly_qty   ->> v_month)::numeric,
                             (monthly_qty   ->> v_month_compact)::numeric, 0)), 0),
      COALESCE(SUM(COALESCE((monthly_sales ->> v_month)::numeric,
                             (monthly_sales ->> v_month_compact)::numeric, 0)), 0)
    INTO v_qty_sum, v_sales_sum
    FROM public.store_products
    WHERE company_id = p_company_id;

    v_total_net_qty := v_total_net_qty + v_qty_sum;
    v_total_sales   := v_total_sales   + v_sales_sum;
  END LOOP;

  -- Count distinct stores that have data for any of the uploaded months
  SELECT COUNT(DISTINCT s.external_id)
  INTO v_stores_count
  FROM public.stores s
  WHERE s.company_id = p_company_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(p_months) AS m(month_key)
      WHERE (s.monthly_gross ->> m.month_key)               IS NOT NULL
         OR (s.monthly_gross ->> replace(m.month_key, '-', '')) IS NOT NULL
    );

  SELECT COUNT(DISTINCT p.external_id)
  INTO v_products_count
  FROM public.products p
  WHERE p.company_id = p_company_id;

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
