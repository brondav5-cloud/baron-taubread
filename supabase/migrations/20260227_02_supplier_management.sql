-- ============================================================
-- Migration: Supplier Management (ניהול ספקים)
-- Per supplier-spec.md — tables for supplier detection, merges, classifications
-- Depends on: 20260227_01_accounting_company_id (user_has_company_access)
-- Uses UUID + FK for company_id (consistent with accounting tables)
-- ============================================================

-- Fix: If suppliers exists with old schema (no identifier_type), add columns before CREATE INDEX
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'identifier_type') THEN
    ALTER TABLE public.suppliers ADD COLUMN identifier_type TEXT;
    ALTER TABLE public.suppliers ADD COLUMN identifier_value TEXT;
    UPDATE public.suppliers SET identifier_type = 'counter_account', identifier_value = 'legacy_' || id::text WHERE identifier_type IS NULL OR identifier_value IS NULL;
    ALTER TABLE public.suppliers ALTER COLUMN identifier_type SET NOT NULL;
    ALTER TABLE public.suppliers ALTER COLUMN identifier_value SET NOT NULL;
    ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_identifier_type_check;
    ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_identifier_type_check CHECK (identifier_type IN ('counter_account', 'name_based'));
    ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_company_identifier_unique;
    ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_company_identifier_unique UNIQUE (company_id, identifier_type, identifier_value);
  END IF;
END $$;

-- ── 2.1 suppliers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('counter_account', 'name_based')),
  identifier_value TEXT NOT NULL,
  is_auto_created BOOLEAN DEFAULT true,
  is_manually_classified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS suppliers_company_idx ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS suppliers_identifier_idx ON public.suppliers(company_id, identifier_type, identifier_value);

-- ── 2.2 supplier_names ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ,
  UNIQUE(supplier_id, name)
);

CREATE INDEX IF NOT EXISTS supplier_names_supplier_idx ON public.supplier_names(supplier_id);

-- ── 2.3 supplier_merges ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  child_supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_supplier_id)
);

CREATE INDEX IF NOT EXISTS supplier_merges_company_idx ON public.supplier_merges(company_id);
CREATE INDEX IF NOT EXISTS supplier_merges_parent_idx ON public.supplier_merges(parent_supplier_id);

-- ── 2.4 supplier_classifications ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS supplier_classifications_company_idx ON public.supplier_classifications(company_id);
CREATE INDEX IF NOT EXISTS supplier_classifications_supplier_idx ON public.supplier_classifications(supplier_id);

-- ── 2.5 transit_accounts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counter_account TEXT NOT NULL,
  display_name TEXT,
  is_auto_detected BOOLEAN DEFAULT true,
  UNIQUE(company_id, counter_account)
);

CREATE INDEX IF NOT EXISTS transit_accounts_company_idx ON public.transit_accounts(company_id);

-- ── 2.6 RLS policies ─────────────────────────────────────────
-- Uses user_has_company_access(uuid) from 20260223_02

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

ALTER TABLE public.supplier_merges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_supplier_merges" ON public.supplier_merges;
CREATE POLICY "rls_supplier_merges" ON public.supplier_merges
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

ALTER TABLE public.supplier_classifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_supplier_classifications" ON public.supplier_classifications;
CREATE POLICY "rls_supplier_classifications" ON public.supplier_classifications
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

ALTER TABLE public.transit_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_transit_accounts" ON public.transit_accounts;
CREATE POLICY "rls_transit_accounts" ON public.transit_accounts
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));
