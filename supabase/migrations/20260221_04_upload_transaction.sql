-- =============================================
-- Upload: Atomic transaction RPC
-- Wraps stores, products, store_products replace in one transaction
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
  -- Order: delete store_products first, then stores/products
  DELETE FROM public.store_products WHERE company_id = p_company_id;
  DELETE FROM public.stores WHERE company_id = p_company_id;
  DELETE FROM public.products WHERE company_id = p_company_id;

  IF coalesce(jsonb_array_length(p_stores), 0) > 0 THEN
    INSERT INTO public.stores (company_id, external_id, name, city, network, driver, agent, monthly_qty, monthly_sales, monthly_gross, monthly_returns, metrics)
    SELECT
      p_company_id,
      (e->>'external_id')::int,
      (e->>'name'),
      nullif(e->>'city', ''),
      nullif(e->>'network', ''),
      nullif(e->>'driver', ''),
      nullif(e->>'agent', ''),
      coalesce(e->'monthly_qty', '{}'),
      coalesce(e->'monthly_sales', '{}'),
      coalesce(e->'monthly_gross', '{}'),
      coalesce(e->'monthly_returns', '{}'),
      coalesce(e->'metrics', '{}')
    FROM jsonb_array_elements(coalesce(p_stores, '[]')) AS e;
  END IF;

  IF coalesce(jsonb_array_length(p_products), 0) > 0 THEN
    INSERT INTO public.products (company_id, external_id, name, category, monthly_qty, monthly_sales, metrics)
    SELECT
      p_company_id,
      (e->>'external_id')::int,
      (e->>'name'),
      nullif(e->>'category', ''),
      coalesce(e->'monthly_qty', '{}'),
      coalesce(e->'monthly_sales', '{}'),
      coalesce(e->'metrics', '{}')
    FROM jsonb_array_elements(coalesce(p_products, '[]')) AS e;
  END IF;

  IF coalesce(jsonb_array_length(p_store_products), 0) > 0 THEN
    INSERT INTO public.store_products (company_id, store_external_id, product_external_id, product_name, product_category, monthly_qty, monthly_sales, total_qty, total_sales)
    SELECT
      p_company_id,
      (e->>'store_external_id')::int,
      (e->>'product_external_id')::int,
      (e->>'product_name'),
      nullif(e->>'product_category', ''),
      coalesce(e->'monthly_qty', '{}'),
      coalesce(e->'monthly_sales', '{}'),
      coalesce((e->>'total_qty')::numeric, 0),
      coalesce((e->>'total_sales')::numeric, 0)
    FROM jsonb_array_elements(coalesce(p_store_products, '[]')) AS e;
  END IF;
END;
$$;
