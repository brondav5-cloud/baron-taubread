-- ============================================================
-- FIX: store_product_weekly — slow/intermittent 500 errors
--
-- Root causes:
--   1. RLS policy uses raw IN (SELECT ...) subqueries that run
--      on every row and are not optimized by the query planner.
--   2. No composite index for the product-analysis query pattern:
--      company_id + product_name_normalized + week_start_date
--      causing sequential scans on large tables.
--
-- Fix strategy:
--   • Use EXISTS (SELECT 1 FROM user_companies WHERE ...) which is
--     safe in RLS (no set-returning function limitation), and is
--     fast because user_companies has an index on (user_id).
--   • Backfill from users is already done in 20260311 migration,
--     so user_companies is the single source of truth.
-- ============================================================

-- ── 1. Replace RLS policy for store_product_weekly ──────────

DROP POLICY IF EXISTS "auth_all_store_product_weekly"
  ON public.store_product_weekly;

CREATE POLICY "auth_all_store_product_weekly"
  ON public.store_product_weekly
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = store_product_weekly.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = store_product_weekly.company_id
    )
  );


-- ── 2. Same fix for store_product_monthly ───────────────────

DROP POLICY IF EXISTS "auth_all_store_product_monthly"
  ON public.store_product_monthly;

CREATE POLICY "auth_all_store_product_monthly"
  ON public.store_product_monthly
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = store_product_monthly.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = store_product_monthly.company_id
    )
  );


-- ── 3. Same fix for product_delivery_uploads ────────────────

DROP POLICY IF EXISTS "auth_all_product_delivery_uploads"
  ON public.product_delivery_uploads;

CREATE POLICY "auth_all_product_delivery_uploads"
  ON public.product_delivery_uploads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = product_delivery_uploads.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = product_delivery_uploads.company_id
    )
  );


-- ── 4. Add missing composite index for product analysis ─────
--    Covers: company_id + product_name_normalized + week_start_date
--    Used by: useProductAnalysis → "all stores for one product over time"

CREATE INDEX IF NOT EXISTS idx_spw_product_week
  ON public.store_product_weekly
  (company_id, product_name_normalized, week_start_date DESC);
