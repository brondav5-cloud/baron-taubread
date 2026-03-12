-- ============================================================
-- WEEKLY & MONTHLY PRODUCT DATA PER STORE
-- פירוט שבועי וחודשי של מוצרים לפי חנות
-- ============================================================

-- ============================================================
-- 1. ADD is_excluded TO products TABLE
--    Allows hiding logistics/packaging items from views
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN NOT NULL DEFAULT FALSE;

-- Pre-mark known logistics/packaging items as excluded
UPDATE public.products
SET is_excluded = TRUE
WHERE
  LOWER(TRIM(name)) LIKE 'פריט כללי%'
  OR LOWER(TRIM(name)) LIKE '%שרינק%'
  OR LOWER(TRIM(name)) LIKE '%קרטונים%'
  OR LOWER(TRIM(name)) LIKE '%משטחים%';

-- ============================================================
-- 2. store_product_weekly
--    Weekly delivery data per store+product
--    Source: פירוט מוצרים Excel (large detailed file)
--    Upsert-safe: same (store × product × week) = update, not duplicate
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_product_weekly (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID          NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Store
  store_external_id       INTEGER       NOT NULL,
  store_name              TEXT          NOT NULL,

  -- Product (matched by name since פירוט מוצרים has no product ID)
  product_name            TEXT          NOT NULL,
  product_name_normalized TEXT          NOT NULL, -- TRIM + LOWER for matching
  
  -- Time
  week_start_date         DATE          NOT NULL,
  year                    INTEGER       NOT NULL,
  month                   INTEGER       NOT NULL,

  -- Quantities
  gross_qty               DECIMAL(12,2) NOT NULL DEFAULT 0, -- כמות (before returns)
  returns_qty             DECIMAL(12,2) NOT NULL DEFAULT 0, -- החזרות
  net_qty                 DECIMAL(12,2) NOT NULL DEFAULT 0, -- סה"כ כמות
  delivery_count          INTEGER       NOT NULL DEFAULT 0, -- unique dates = supply visits

  -- Timestamps
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- One record per store × product × week
  UNIQUE (company_id, store_external_id, product_name_normalized, week_start_date)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_spw_company
  ON public.store_product_weekly (company_id);

CREATE INDEX IF NOT EXISTS idx_spw_store
  ON public.store_product_weekly (company_id, store_external_id);

CREATE INDEX IF NOT EXISTS idx_spw_week
  ON public.store_product_weekly (company_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_spw_store_product
  ON public.store_product_weekly (company_id, store_external_id, product_name_normalized);

CREATE INDEX IF NOT EXISTS idx_spw_year_month
  ON public.store_product_weekly (company_id, year, month);

-- ============================================================
-- 3. store_product_monthly
--    Monthly sales data per store+product
--    Source: נתוני חלוקה Excel (the regular monthly file)
--    Accumulates — each month is a separate row (never replaces history)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_product_monthly (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID          NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Store
  store_external_id     INTEGER       NOT NULL,
  store_name            TEXT          NOT NULL,

  -- Product
  product_external_id   INTEGER       NOT NULL, -- from נתוני חלוקה (has IDs)
  product_name          TEXT          NOT NULL,

  -- Time
  month_key             TEXT          NOT NULL, -- "2024-01" format
  year                  INTEGER       NOT NULL,
  month                 INTEGER       NOT NULL,

  -- Metrics
  qty                   DECIMAL(12,2) NOT NULL DEFAULT 0, -- net quantity
  sales                 DECIMAL(14,2) NOT NULL DEFAULT 0, -- revenue (₪)
  returns_qty           DECIMAL(12,2) NOT NULL DEFAULT 0,
  returns_pct           DECIMAL(8,4)  NOT NULL DEFAULT 0,

  -- Timestamps
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- One record per store × product × month
  UNIQUE (company_id, store_external_id, product_external_id, month_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spm_company
  ON public.store_product_monthly (company_id);

CREATE INDEX IF NOT EXISTS idx_spm_store
  ON public.store_product_monthly (company_id, store_external_id);

CREATE INDEX IF NOT EXISTS idx_spm_month
  ON public.store_product_monthly (company_id, month_key);

CREATE INDEX IF NOT EXISTS idx_spm_store_product
  ON public.store_product_monthly (company_id, store_external_id, product_external_id);

-- ============================================================
-- 4. product_delivery_uploads
--    Tracks uploads of פירוט מוצרים files
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_delivery_uploads (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  filename            TEXT        NOT NULL,
  uploaded_by         UUID        REFERENCES public.users(id),
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Period covered by this upload
  period_start        DATE,
  period_end          DATE,
  weeks_count         INTEGER     DEFAULT 0,

  -- Stats
  rows_processed      INTEGER     DEFAULT 0,
  rows_skipped        INTEGER     DEFAULT 0, -- excluded products
  stores_count        INTEGER     DEFAULT 0,
  products_count      INTEGER     DEFAULT 0,
  total_gross_qty     DECIMAL(14,2) DEFAULT 0,
  total_returns_qty   DECIMAL(14,2) DEFAULT 0,
  delivery_events     INTEGER     DEFAULT 0,

  status              TEXT        NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('processing', 'completed', 'failed')),
  error_message       TEXT,
  processing_time_ms  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pdu_company
  ON public.product_delivery_uploads (company_id);

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- store_product_weekly
ALTER TABLE public.store_product_weekly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_store_product_weekly"
  ON public.store_product_weekly
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  );

-- store_product_monthly
ALTER TABLE public.store_product_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_store_product_monthly"
  ON public.store_product_monthly
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  );

-- product_delivery_uploads
ALTER TABLE public.product_delivery_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_product_delivery_uploads"
  ON public.product_delivery_uploads
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  );
