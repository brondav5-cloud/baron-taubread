-- =============================================
-- Store Products - Data Integrity Hardening
-- =============================================

-- 1) Ensure NOT NULL on core identity fields
ALTER TABLE public.store_products
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN store_external_id SET NOT NULL,
  ALTER COLUMN product_external_id SET NOT NULL;

-- 2) Prevent duplicates: one row per (company, store, product)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'store_products_company_store_product_uniq'
  ) THEN
    ALTER TABLE public.store_products
      ADD CONSTRAINT store_products_company_store_product_uniq
      UNIQUE (company_id, store_external_id, product_external_id);
  END IF;
END $$;

-- 3) Helpful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_store_products_company_store
  ON public.store_products (company_id, store_external_id);

CREATE INDEX IF NOT EXISTS idx_store_products_company_product
  ON public.store_products (company_id, product_external_id);

-- 4) Non-negative totals (allow NULL if you haven't backfilled yet)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_products_total_qty_nonneg'
  ) THEN
    ALTER TABLE public.store_products
      ADD CONSTRAINT store_products_total_qty_nonneg
      CHECK (total_qty IS NULL OR total_qty >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_products_total_sales_nonneg'
  ) THEN
    ALTER TABLE public.store_products
      ADD CONSTRAINT store_products_total_sales_nonneg
      CHECK (total_sales IS NULL OR total_sales >= 0);
  END IF;
END $$;
