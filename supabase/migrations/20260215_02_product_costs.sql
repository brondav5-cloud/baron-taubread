-- =============================================
-- Product Costs - עלויות מוצרים
-- =============================================

CREATE TABLE IF NOT EXISTS public.product_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  product_external_id integer NOT NULL,
  raw_material numeric NOT NULL DEFAULT 0,
  labor numeric NOT NULL DEFAULT 0,
  operational numeric NOT NULL DEFAULT 0,
  packaging numeric NOT NULL DEFAULT 0,
  storage numeric NOT NULL DEFAULT 0,
  misc numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, product_external_id)
);

CREATE INDEX IF NOT EXISTS idx_product_costs_company_id ON public.product_costs (company_id);
