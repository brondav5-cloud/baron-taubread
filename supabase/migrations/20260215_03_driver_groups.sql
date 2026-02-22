-- =============================================
-- Driver Groups - קבוצות נהגים
-- =============================================

CREATE TABLE IF NOT EXISTS public.driver_groups (
  id text PRIMARY KEY,
  company_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  driver_names jsonb NOT NULL DEFAULT '[]',
  product_costs jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_groups_company_id ON public.driver_groups (company_id);
