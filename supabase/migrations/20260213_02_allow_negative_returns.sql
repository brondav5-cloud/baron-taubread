-- =============================================
-- Allow negative totals for returns/credits
-- =============================================

DO $$
BEGIN
  -- Drop constraints if exist (from previous hardening step)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_products_total_qty_nonneg') THEN
    ALTER TABLE public.store_products DROP CONSTRAINT store_products_total_qty_nonneg;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_products_total_sales_nonneg') THEN
    ALTER TABLE public.store_products DROP CONSTRAINT store_products_total_sales_nonneg;
  END IF;
END $$;
