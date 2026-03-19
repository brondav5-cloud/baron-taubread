-- ============================================================
-- Server-side weekly → monthly aggregation for the distribution page.
-- Replaces client-side aggregation that was limited by PostgREST
-- default row cap (1,000 rows) on large datasets.
--
-- Returns one row per (store × product × month), already enriched
-- with stores/products metadata via JOINs.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_monthly_distribution(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_monthly_distribution(
  p_company_id uuid,
  p_date_from  date,
  p_date_to    date
)
RETURNS TABLE (
  store_external_id     integer,
  store_name            text,
  product_name          text,
  product_name_normalized text,
  "year"                integer,
  "month"               integer,
  gross_qty             numeric,
  returns_qty           numeric,
  net_qty               numeric,
  total_value           numeric,
  delivery_count        bigint,
  city                  text,
  network               text,
  driver                text,
  agent                 text,
  product_external_id   integer,
  product_category      text,
  max_updated_at        timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.store_external_id,
    COALESCE(s.name, MAX(w.store_name))       AS store_name,
    MAX(w.product_name)                        AS product_name,
    w.product_name_normalized,
    w.year                                     AS "year",
    w.month                                    AS "month",
    SUM(w.gross_qty)                           AS gross_qty,
    SUM(w.returns_qty)                         AS returns_qty,
    SUM(w.net_qty)                             AS net_qty,
    SUM(w.total_value)                         AS total_value,
    SUM(w.delivery_count)::bigint              AS delivery_count,
    s.city,
    s.network,
    s.driver,
    s.agent,
    p.p_external_id                            AS product_external_id,
    p.p_category                               AS product_category,
    MAX(w.updated_at)                          AS max_updated_at
  FROM store_product_weekly w
  LEFT JOIN stores s
    ON s.company_id = p_company_id
    AND s.external_id = w.store_external_id
  LEFT JOIN (
    SELECT
      LOWER(TRIM(pr.name))   AS p_name_norm,
      MIN(pr.external_id)    AS p_external_id,
      MIN(pr.category)       AS p_category
    FROM products pr
    WHERE pr.company_id = p_company_id
    GROUP BY LOWER(TRIM(pr.name))
  ) p ON p.p_name_norm = w.product_name_normalized
  WHERE w.company_id = p_company_id
    AND w.week_start_date >= p_date_from
    AND w.week_start_date <= p_date_to
  GROUP BY
    w.store_external_id, w.product_name_normalized,
    w.year, w.month,
    s.name, s.city, s.network, s.driver, s.agent,
    p.p_external_id, p.p_category
  ORDER BY w.year, w.month;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_distribution(uuid, date, date)
  TO authenticated, service_role;
