-- ============================================================
-- Non-destructive performance hardening for analytics uploads.
-- NOTE: This migration does NOT delete business rows.
-- ============================================================

-- Drop low-value duplicate indexes on store_product_weekly.
-- Core uniqueness and query-critical indexes remain untouched.
DROP INDEX IF EXISTS public.idx_spw_company;
DROP INDEX IF EXISTS public.idx_spw_store;
DROP INDEX IF EXISTS public.idx_spw_year_month;
DROP INDEX IF EXISTS public.idx_spw_store_product;

-- Speed monthly delivery fetches used by period-based comparisons.
CREATE INDEX IF NOT EXISTS idx_store_deliveries_monthly_period_lookup
  ON public.store_deliveries (company_id, year, month, store_external_id)
  WHERE week IS NULL;

-- Better support smart-order daily reads by store + recent weeks.
CREATE INDEX IF NOT EXISTS idx_spd_company_store_week
  ON public.store_product_daily (company_id, store_external_id, week_start_date DESC);
