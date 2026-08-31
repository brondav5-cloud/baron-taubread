-- Keep stores/products catalog in sync with פירוט מוצרים monthly totals.
-- New stores/products that appear only in product-detail files were previously
-- missing from the Stores and Products pages.

CREATE OR REPLACE FUNCTION public.sync_catalog_from_monthly_dist(
  p_company_id uuid,
  p_from_yyyymm integer,
  p_to_yyyymm integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stores_inserted integer := 0;
  products_inserted integer := 0;
BEGIN
  INSERT INTO stores (
    company_id, external_id, name,
    monthly_qty, monthly_sales, monthly_gross, monthly_returns, metrics
  )
  SELECT
    p_company_id,
    d.store_external_id,
    MIN(d.store_name),
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
  FROM store_product_monthly_dist d
  WHERE d.company_id = p_company_id
    AND (d.year * 100 + d.month) BETWEEN p_from_yyyymm AND p_to_yyyymm
    AND NOT EXISTS (
      SELECT 1 FROM stores s
      WHERE s.company_id = p_company_id AND s.external_id = d.store_external_id
    )
  GROUP BY d.store_external_id;
  GET DIAGNOSTICS stores_inserted = ROW_COUNT;

  INSERT INTO products (
    company_id, external_id, name, monthly_qty, monthly_sales, metrics
  )
  SELECT
    p_company_id,
    COALESCE((
      SELECT MAX(p.external_id) FROM products p WHERE p.company_id = p_company_id
    ), 0) + ROW_NUMBER() OVER (ORDER BY d.product_name_normalized),
    MIN(d.product_name),
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
  FROM store_product_monthly_dist d
  WHERE d.company_id = p_company_id
    AND (d.year * 100 + d.month) BETWEEN p_from_yyyymm AND p_to_yyyymm
    AND COALESCE(d.product_name_normalized, '') <> ''
    AND NOT EXISTS (
      SELECT 1 FROM products p
      WHERE p.company_id = p_company_id
        AND lower(trim(p.name)) = d.product_name_normalized
    )
  GROUP BY d.product_name_normalized;
  GET DIAGNOSTICS products_inserted = ROW_COUNT;

  UPDATE stores s
  SET
    monthly_qty = COALESCE(s.monthly_qty, '{}'::jsonb) || a.qty_map,
    monthly_sales = COALESCE(s.monthly_sales, '{}'::jsonb) || a.sales_map,
    monthly_gross = COALESCE(s.monthly_gross, '{}'::jsonb) || a.gross_map,
    monthly_returns = COALESCE(s.monthly_returns, '{}'::jsonb) || a.returns_map,
    updated_at = now()
  FROM (
    SELECT
      store_external_id,
      jsonb_object_agg(ym, net_qty) AS qty_map,
      jsonb_object_agg(ym, sales) AS sales_map,
      jsonb_object_agg(ym, gross_qty) AS gross_map,
      jsonb_object_agg(ym, returns_qty) AS returns_map
    FROM (
      SELECT
        store_external_id,
        (year::text || lpad(month::text, 2, '0')) AS ym,
        SUM(net_qty) AS net_qty,
        SUM(total_value) AS sales,
        SUM(gross_qty) AS gross_qty,
        SUM(returns_qty) AS returns_qty
      FROM store_product_monthly_dist
      WHERE company_id = p_company_id
        AND (year * 100 + month) BETWEEN p_from_yyyymm AND p_to_yyyymm
      GROUP BY store_external_id, year, month
    ) x
    GROUP BY store_external_id
  ) a
  WHERE s.company_id = p_company_id
    AND s.external_id = a.store_external_id;

  UPDATE products p
  SET
    monthly_qty = COALESCE(p.monthly_qty, '{}'::jsonb) || a.qty_map,
    monthly_sales = COALESCE(p.monthly_sales, '{}'::jsonb) || a.sales_map,
    updated_at = now()
  FROM (
    SELECT
      product_name_normalized,
      jsonb_object_agg(ym, net_qty) AS qty_map,
      jsonb_object_agg(ym, sales) AS sales_map
    FROM (
      SELECT
        product_name_normalized,
        (year::text || lpad(month::text, 2, '0')) AS ym,
        SUM(net_qty) AS net_qty,
        SUM(total_value) AS sales
      FROM store_product_monthly_dist
      WHERE company_id = p_company_id
        AND (year * 100 + month) BETWEEN p_from_yyyymm AND p_to_yyyymm
      GROUP BY product_name_normalized, year, month
    ) x
    GROUP BY product_name_normalized
  ) a
  WHERE p.company_id = p_company_id
    AND lower(trim(p.name)) = a.product_name_normalized;

  RETURN jsonb_build_object(
    'stores_inserted', stores_inserted,
    'products_inserted', products_inserted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_catalog_from_monthly_dist(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_catalog_from_monthly_dist(uuid, integer, integer) TO authenticated;
