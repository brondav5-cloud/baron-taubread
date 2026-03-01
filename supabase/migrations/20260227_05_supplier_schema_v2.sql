-- ============================================================
-- Migration: Supplier schema v2 (simplified)
-- Per spec: H (counter_account) + M (name) only, no transit_accounts
-- Drops: transit_accounts, supplier_merges
-- Rebuilds: suppliers, supplier_names, supplier_classifications
-- Adds: revenue_groups
-- ============================================================
-- Depends on: 20260227_01, 20260227_02 (suppliers/supplier_names exist)
-- Note: 20260227_04 already dropped supplier_classifications
-- ============================================================

-- 1. Drop dependent tables (order: FKs first)
DROP TABLE IF EXISTS public.supplier_merges CASCADE;
DROP TABLE IF EXISTS public.transit_accounts CASCADE;
DROP TABLE IF EXISTS public.supplier_classifications CASCADE;
DROP TABLE IF EXISTS public.supplier_names CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;

-- 2. Create suppliers (v2 schema)
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counter_account TEXT NOT NULL,
  display_name TEXT NOT NULL,
  auto_account_code TEXT,
  auto_account_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, counter_account)
);

CREATE INDEX IF NOT EXISTS suppliers_company_idx ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS suppliers_counter_account_idx ON public.suppliers(company_id, counter_account);

-- 3. Create supplier_names
CREATE TABLE public.supplier_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  counter_account_override TEXT,
  UNIQUE(supplier_id, name)
);

CREATE INDEX IF NOT EXISTS supplier_names_supplier_idx ON public.supplier_names(supplier_id);

-- 4. Create supplier_classifications
CREATE TABLE public.supplier_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  manual_account_code TEXT NOT NULL,
  manual_account_name TEXT,
  match_by_name BOOLEAN DEFAULT false,
  match_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS supplier_classifications_company_idx ON public.supplier_classifications(company_id);
CREATE INDEX IF NOT EXISTS supplier_classifications_supplier_idx ON public.supplier_classifications(supplier_id);

-- 5. Create revenue_groups (for marking which group_codes are revenue)
CREATE TABLE public.revenue_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  group_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, group_code)
);

CREATE INDEX IF NOT EXISTS revenue_groups_company_idx ON public.revenue_groups(company_id);

-- 6. RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_suppliers" ON public.suppliers;
CREATE POLICY "rls_suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

ALTER TABLE public.supplier_names ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_supplier_names" ON public.supplier_names;
CREATE POLICY "rls_supplier_names" ON public.supplier_names
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.user_has_company_access(s.company_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND public.user_has_company_access(s.company_id))
  );

ALTER TABLE public.supplier_classifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_supplier_classifications" ON public.supplier_classifications;
CREATE POLICY "rls_supplier_classifications" ON public.supplier_classifications
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

ALTER TABLE public.revenue_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_revenue_groups" ON public.revenue_groups;
CREATE POLICY "rls_revenue_groups" ON public.revenue_groups
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));
