-- =============================================
-- Individual Drivers - נהגים בודדים
-- =============================================

CREATE TABLE IF NOT EXISTS public.individual_drivers (
  id text PRIMARY KEY,
  company_id text NOT NULL,
  driver_name text NOT NULL DEFAULT '',
  product_costs jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_individual_drivers_company_id ON public.individual_drivers (company_id);
