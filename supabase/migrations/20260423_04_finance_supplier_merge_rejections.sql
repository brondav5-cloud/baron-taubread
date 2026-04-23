-- Keep manual "do not merge" decisions for supplier suggestions

CREATE TABLE IF NOT EXISTS public.finance_supplier_merge_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_a_id uuid NOT NULL REFERENCES public.finance_suppliers(id) ON DELETE CASCADE,
  supplier_b_id uuid NOT NULL REFERENCES public.finance_suppliers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (supplier_a_id <> supplier_b_id),
  UNIQUE (company_id, supplier_a_id, supplier_b_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_supplier_merge_rejections_company
  ON public.finance_supplier_merge_rejections(company_id);

ALTER TABLE public.finance_supplier_merge_rejections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_finance_supplier_merge_rejections" ON public.finance_supplier_merge_rejections;
CREATE POLICY "auth_all_finance_supplier_merge_rejections" ON public.finance_supplier_merge_rejections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
