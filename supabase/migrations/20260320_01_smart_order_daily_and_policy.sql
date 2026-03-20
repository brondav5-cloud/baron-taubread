-- ============================================================
-- Smart Order System
-- 1. store_product_daily  — aggregation per store × product × week × day_of_week
--    Populated from "פירוט מוצרים" Excel upload (col "יום", values 1=Sun … 7=Sat).
--    Enables day-aware order recommendations (e.g. Sunday vs Thursday split).
-- 2. returns_policy        — configurable normal returns % thresholds per company.
--    If no rows exist for a company, the engine falls back to built-in defaults.
-- ============================================================

-- ── 1. store_product_daily ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_product_daily (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID          NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  store_external_id       INTEGER       NOT NULL,
  store_name              TEXT          NOT NULL,

  product_name            TEXT          NOT NULL,
  product_name_normalized TEXT          NOT NULL,

  week_start_date         DATE          NOT NULL,
  day_of_week             SMALLINT      NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  -- 1 = Sunday, 2 = Monday, …, 7 = Saturday (Israel standard: week starts Sunday)

  year                    INTEGER       NOT NULL,
  month                   SMALLINT      NOT NULL,

  gross_qty               DECIMAL(10,2) NOT NULL DEFAULT 0,
  returns_qty             DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_qty                 DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_count          INTEGER       NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, store_external_id, product_name_normalized, week_start_date, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_spd_company_week
  ON public.store_product_daily (company_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_spd_company_store
  ON public.store_product_daily (company_id, store_external_id);

CREATE INDEX IF NOT EXISTS idx_spd_company_store_product
  ON public.store_product_daily (company_id, store_external_id, product_name_normalized);

ALTER TABLE public.store_product_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_store_product_daily"
  ON public.store_product_daily
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.users        WHERE id       = auth.uid())
    OR
    company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users        WHERE id       = auth.uid())
    OR
    company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  );

-- ── 2. returns_policy ──────────────────────────────────────────────────────
-- Each row: if monthly_gross_qty ∈ [min_monthly_qty, max_monthly_qty) → normal_returns_pct.
-- max_monthly_qty = NULL means "no upper bound" (the catch-all top bracket).

CREATE TABLE IF NOT EXISTS public.returns_policy (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID          NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  min_monthly_qty     INTEGER       NOT NULL DEFAULT 0 CHECK (min_monthly_qty >= 0),
  max_monthly_qty     INTEGER       CHECK (max_monthly_qty IS NULL OR max_monthly_qty > min_monthly_qty),
  normal_returns_pct  DECIMAL(5,2)  NOT NULL CHECK (normal_returns_pct >= 0 AND normal_returns_pct <= 100),
  label               TEXT,         -- e.g. "עד 10 יח׳ / חודש"
  sort_order          SMALLINT      NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.returns_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_returns_policy"
  ON public.returns_policy
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.users        WHERE id       = auth.uid())
    OR
    company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users        WHERE id       = auth.uid())
    OR
    company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  );
