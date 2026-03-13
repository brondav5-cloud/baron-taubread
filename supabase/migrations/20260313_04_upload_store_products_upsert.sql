-- =============================================
-- Performance fix: store_products upsert with JSONB merge
--
-- Problem: the old RPC fetched all store_products (~30,000 rows) to the
-- application layer for merging, causing timeouts for large companies.
--
-- Solution: move the merge to the DB (INSERT ... ON CONFLICT DO UPDATE
-- with jsonb ||). No client-side fetch needed anymore.
--
-- stores + products still do full replace (small tables, need metrics recompute).
-- store_products: upsert only — historical months are preserved automatically.
-- =============================================

CREATE OR REPLACE FUNCTION public.perform_company_data_upload(
  p_company_id uuid,
  p_stores jsonb,
  p_products jsonb,
  p_store_products jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Stores + products: full replace (metrics are recomputed on every upload)
  -- No FK from store_products → stores, so order doesn't matter
  DELETE FROM public.stores   WHERE company_id = p_company_id;
  DELETE FROM public.products WHERE company_id = p_company_id;

  IF coalesce(jsonb_array_length(p_stores), 0) > 0 THEN
    INSERT INTO public.stores (
      company_id, external_id, name, city, network, driver, agent,
      monthly_qty, monthly_sales, monthly_gross, monthly_returns, metrics
    )
    SELECT
      p_company_id,
      (e->>'external_id')::int,
      (e->>'name'),
      nullif(e->>'city', ''),
      nullif(e->>'network', ''),
      nullif(e->>'driver', ''),
      nullif(e->>'agent', ''),
      coalesce(e->'monthly_qty',     '{}'),
      coalesce(e->'monthly_sales',   '{}'),
      coalesce(e->'monthly_gross',   '{}'),
      coalesce(e->'monthly_returns', '{}'),
      coalesce(e->'metrics',         '{}')
    FROM jsonb_array_elements(coalesce(p_stores, '[]')) AS e;
  END IF;

  IF coalesce(jsonb_array_length(p_products), 0) > 0 THEN
    INSERT INTO public.products (
      company_id, external_id, name, category,
      monthly_qty, monthly_sales, metrics
    )
    SELECT
      p_company_id,
      (e->>'external_id')::int,
      (e->>'name'),
      nullif(e->>'category', ''),
      coalesce(e->'monthly_qty',   '{}'),
      coalesce(e->'monthly_sales', '{}'),
      coalesce(e->'metrics',       '{}')
    FROM jsonb_array_elements(coalesce(p_products, '[]')) AS e;
  END IF;

  -- store_products: upsert with server-side JSONB merge.
  -- New months are added; existing months with the same key are overwritten.
  -- Historical months NOT in this upload are preserved automatically.
  -- total_qty / total_sales are recalculated from the fully merged JSONB.
  IF coalesce(jsonb_array_length(p_store_products), 0) > 0 THEN
    INSERT INTO public.store_products (
      company_id, store_external_id, product_external_id,
      product_name, product_category,
      monthly_qty, monthly_sales, monthly_returns,
      total_qty, total_sales
    )
    SELECT
      p_company_id,
      (e->>'store_external_id')::int,
      (e->>'product_external_id')::int,
      (e->>'product_name'),
      nullif(e->>'product_category', ''),
      coalesce(e->'monthly_qty',     '{}'),
      coalesce(e->'monthly_sales',   '{}'),
      coalesce(e->'monthly_returns', '{}'),
      coalesce((e->>'total_qty')::numeric,   0),
      coalesce((e->>'total_sales')::numeric, 0)
    FROM jsonb_array_elements(coalesce(p_store_products, '[]')) AS e
    ON CONFLICT (company_id, store_external_id, product_external_id) DO UPDATE SET
      product_name     = EXCLUDED.product_name,
      product_category = EXCLUDED.product_category,
      -- jsonb || merges objects: existing keys kept, new keys added, conflicts → new wins
      monthly_qty      = store_products.monthly_qty     || EXCLUDED.monthly_qty,
      monthly_sales    = store_products.monthly_sales   || EXCLUDED.monthly_sales,
      monthly_returns  = store_products.monthly_returns || EXCLUDED.monthly_returns,
      -- Recalculate totals from the fully merged JSONB (sum all monthly values)
      total_qty = (
        SELECT coalesce(sum(v::numeric), 0)
        FROM jsonb_each_text(store_products.monthly_qty || EXCLUDED.monthly_qty) AS j(k, v)
      ),
      total_sales = (
        SELECT coalesce(sum(v::numeric), 0)
        FROM jsonb_each_text(store_products.monthly_sales || EXCLUDED.monthly_sales) AS j(k, v)
      );
  END IF;
END;
$$;
