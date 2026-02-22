-- =============================================
-- Store Pricing - מחירון חנויות
-- =============================================

CREATE TABLE IF NOT EXISTS public.store_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  store_external_id integer NOT NULL,
  store_name text NOT NULL DEFAULT '',
  agent text NOT NULL DEFAULT '',
  driver text NOT NULL DEFAULT '',
  store_discount numeric NOT NULL DEFAULT 0 CHECK (store_discount >= 0 AND store_discount <= 100),
  excluded_product_ids jsonb NOT NULL DEFAULT '[]',
  products jsonb NOT NULL DEFAULT '[]',
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, store_external_id)
);

CREATE INDEX IF NOT EXISTS idx_store_pricing_company_id ON public.store_pricing (company_id);
