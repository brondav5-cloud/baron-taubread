-- Finance supplier master (canonical supplier names across banks)

CREATE TABLE IF NOT EXISTS public.finance_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  master_name text NOT NULL,
  normalized_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_finance_suppliers_company
  ON public.finance_suppliers(company_id);

CREATE TABLE IF NOT EXISTS public.finance_supplier_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.finance_suppliers(id) ON DELETE CASCADE,
  alias_name text NOT NULL,
  normalized_alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_finance_supplier_aliases_supplier
  ON public.finance_supplier_aliases(supplier_id);

ALTER TABLE public.finance_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_finance_suppliers" ON public.finance_suppliers;
CREATE POLICY "auth_all_finance_suppliers" ON public.finance_suppliers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.finance_supplier_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_finance_supplier_aliases" ON public.finance_supplier_aliases;
CREATE POLICY "auth_all_finance_supplier_aliases" ON public.finance_supplier_aliases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.finance_suppliers(id) ON DELETE SET NULL;

ALTER TABLE public.bank_transaction_splits
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.finance_suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_supplier_id
  ON public.bank_transactions(company_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_bank_transaction_splits_supplier_id
  ON public.bank_transaction_splits(company_id, supplier_id);
