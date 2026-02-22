-- =============================================
-- Production Readiness: Fixes & RLS
-- 1. work_plan_items: day 0-5 only (6 ימי עבודה)
-- 2. filters table (if missing)
-- 3. RLS policies on main tables
-- =============================================

-- 1. Fix work_plan_items day constraint (6 ימי עבודה, ללא שבת)
ALTER TABLE public.work_plan_items DROP CONSTRAINT IF EXISTS work_plan_items_day_check;
ALTER TABLE public.work_plan_items ADD CONSTRAINT work_plan_items_day_check
  CHECK (day >= 0 AND day <= 5);

-- 2. Filters table (ערכי סינון לכל company - cities, networks, agents, drivers, categories)
-- Note: If table exists with different schema (e.g. text[] columns), it is left as-is.
CREATE TABLE IF NOT EXISTS public.filters (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  cities jsonb NOT NULL DEFAULT '[]',
  networks jsonb NOT NULL DEFAULT '[]',
  drivers jsonb NOT NULL DEFAULT '[]',
  agents jsonb NOT NULL DEFAULT '[]',
  categories jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS - Enable and add policies for company-scoped tables
-- stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company stores" ON public.stores;
CREATE POLICY "Users can view own company stores" ON public.stores FOR SELECT
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access stores" ON public.stores;
CREATE POLICY "Service role full access stores" ON public.stores FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company products" ON public.products;
CREATE POLICY "Users can view own company products" ON public.products FOR SELECT
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access products" ON public.products;
CREATE POLICY "Service role full access products" ON public.products FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- filters
ALTER TABLE public.filters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company filters" ON public.filters;
CREATE POLICY "Users can view own company filters" ON public.filters FOR SELECT
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own company filters" ON public.filters;
CREATE POLICY "Users can manage own company filters" ON public.filters FOR ALL
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

-- data_metadata
ALTER TABLE public.data_metadata ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company metadata" ON public.data_metadata;
CREATE POLICY "Users can view own company metadata" ON public.data_metadata FOR SELECT
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access metadata" ON public.data_metadata;
CREATE POLICY "Service role full access metadata" ON public.data_metadata FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- visits
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own company visits" ON public.visits;
CREATE POLICY "Users can manage own company visits" ON public.visits FOR ALL
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

-- store_treatments
ALTER TABLE public.store_treatments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own company treatments" ON public.store_treatments;
CREATE POLICY "Users can manage own company treatments" ON public.store_treatments FOR ALL
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

-- store_treatment_history
ALTER TABLE public.store_treatment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company treatment history" ON public.store_treatment_history;
CREATE POLICY "Users can view own company treatment history" ON public.store_treatment_history FOR SELECT
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

-- work_plan_items
ALTER TABLE public.work_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own company work plan" ON public.work_plan_items;
CREATE POLICY "Users can manage own company work plan" ON public.work_plan_items FOR ALL
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

-- product_costs
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own company product costs" ON public.product_costs;
CREATE POLICY "Users can manage own company product costs" ON public.product_costs FOR ALL
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

-- driver_groups
ALTER TABLE public.driver_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own company driver groups" ON public.driver_groups;
CREATE POLICY "Users can manage own company driver groups" ON public.driver_groups FOR ALL
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));

-- individual_drivers
ALTER TABLE public.individual_drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own company individual drivers" ON public.individual_drivers;
CREATE POLICY "Users can manage own company individual drivers" ON public.individual_drivers FOR ALL
  USING (company_id::text IN (SELECT company_id::text FROM public.users WHERE id = auth.uid()));
