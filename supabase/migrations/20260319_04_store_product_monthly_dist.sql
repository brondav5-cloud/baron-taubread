-- ============================================================
-- store_product_monthly_dist
-- Monthly aggregated delivery data for the distribution view.
-- Source: פירוט מוצרים Excel (same file as store_product_weekly)
--
-- WHY a separate table?
--   store_product_weekly is keyed on week_start_date (col D) and is used
--   by the weekly-comparison screen. week_start_date is always the Monday
--   of the delivery week — so week 2023-12-31 belongs to ISO-week 1 of 2024
--   yet falls in calendar December. That table's year/month are derived from
--   the week start date and must stay that way for the weekly view.
--
--   The distribution view cares about CALENDAR month (col C "חודש") and
--   CALENDAR year (col B "תאריך מסמך"). The separation keeps each table
--   internally consistent and each view correct independently.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_product_monthly_dist (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID          NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  store_external_id       INTEGER       NOT NULL,
  store_name              TEXT          NOT NULL,

  product_name            TEXT          NOT NULL,
  product_name_normalized TEXT          NOT NULL,

  -- year + month come from document date (col B) and month column (col C)
  year                    INTEGER       NOT NULL,
  month                   INTEGER       NOT NULL,

  gross_qty               DECIMAL(12,2) NOT NULL DEFAULT 0,
  returns_qty             DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_qty                 DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_value             DECIMAL(14,2) NOT NULL DEFAULT 0,
  delivery_count          INTEGER       NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, store_external_id, product_name_normalized, year, month)
);

CREATE INDEX IF NOT EXISTS idx_spmd_company
  ON public.store_product_monthly_dist (company_id);

CREATE INDEX IF NOT EXISTS idx_spmd_store
  ON public.store_product_monthly_dist (company_id, store_external_id);

CREATE INDEX IF NOT EXISTS idx_spmd_year_month
  ON public.store_product_monthly_dist (company_id, year, month);

CREATE INDEX IF NOT EXISTS idx_spmd_store_product
  ON public.store_product_monthly_dist (company_id, store_external_id, product_name_normalized);

-- RLS
ALTER TABLE public.store_product_monthly_dist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_store_product_monthly_dist"
  ON public.store_product_monthly_dist
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  );

-- ============================================================
-- Update get_monthly_distribution to query store_product_monthly_dist.
-- Filters by year/month (not week_start_date) so edge weeks like
-- 2023-12-31 correctly appear in January 2024.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_monthly_distribution(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_monthly_distribution(
  p_company_id uuid,
  p_date_from  date,
  p_date_to    date
)
RETURNS TABLE (
  store_external_id       integer,
  store_name              text,
  product_name            text,
  product_name_normalized text,
  "year"                  integer,
  "month"                 integer,
  gross_qty               numeric,
  returns_qty             numeric,
  net_qty                 numeric,
  total_value             numeric,
  delivery_count          bigint,
  city                    text,
  network                 text,
  driver                  text,
  agent                   text,
  product_external_id     integer,
  product_category        text,
  max_updated_at          timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_from  integer := EXTRACT(YEAR  FROM p_date_from)::integer;
  v_month_from integer := EXTRACT(MONTH FROM p_date_from)::integer;
  v_year_to    integer := EXTRACT(YEAR  FROM p_date_to)::integer;
  v_month_to   integer := EXTRACT(MONTH FROM p_date_to)::integer;
BEGIN
  RETURN QUERY
  SELECT
    d.store_external_id,
    COALESCE(s.name, MAX(d.store_name))        AS store_name,
    MAX(d.product_name)                         AS product_name,
    d.product_name_normalized,
    d.year                                      AS "year",
    d.month                                     AS "month",
    SUM(d.gross_qty)                            AS gross_qty,
    SUM(d.returns_qty)                          AS returns_qty,
    SUM(d.net_qty)                              AS net_qty,
    SUM(d.total_value)                          AS total_value,
    SUM(d.delivery_count)::bigint               AS delivery_count,
    s.city,
    s.network,
    s.driver,
    s.agent,
    p.p_external_id                             AS product_external_id,
    p.p_category                                AS product_category,
    MAX(d.updated_at)                           AS max_updated_at
  FROM store_product_monthly_dist d
  LEFT JOIN stores s
    ON  s.company_id = p_company_id
    AND s.external_id = d.store_external_id
  LEFT JOIN (
    SELECT
      LOWER(TRIM(pr.name))  AS p_name_norm,
      MIN(pr.external_id)   AS p_external_id,
      MIN(pr.category)      AS p_category
    FROM products pr
    WHERE pr.company_id = p_company_id
    GROUP BY LOWER(TRIM(pr.name))
  ) p ON p.p_name_norm = d.product_name_normalized
  WHERE d.company_id = p_company_id
    AND (d.year * 100 + d.month) >= (v_year_from * 100 + v_month_from)
    AND (d.year * 100 + d.month) <= (v_year_to   * 100 + v_month_to)
  GROUP BY
    d.store_external_id, d.product_name_normalized,
    d.year, d.month,
    s.name, s.city, s.network, s.driver, s.agent,
    p.p_external_id, p.p_category
  ORDER BY d.year, d.month;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_distribution(uuid, date, date)
  TO authenticated, service_role;
