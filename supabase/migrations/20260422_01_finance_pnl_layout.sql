-- ============================================================
-- Finance P&L Layout (custom blocks + category ordering)
-- ============================================================

CREATE TABLE public.finance_pnl_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('income', 'cost_of_goods', 'operating', 'admin', 'finance', 'other')),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_pnl_blocks_company
  ON public.finance_pnl_blocks(company_id, sort_order);

ALTER TABLE public.finance_pnl_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_finance_pnl_blocks" ON public.finance_pnl_blocks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.finance_pnl_block_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  block_id    uuid NOT NULL REFERENCES public.finance_pnl_blocks(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.bank_categories(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, block_id, category_id),
  UNIQUE (company_id, category_id)
);

CREATE INDEX idx_finance_pnl_block_categories_company
  ON public.finance_pnl_block_categories(company_id, block_id, sort_order);

ALTER TABLE public.finance_pnl_block_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_finance_pnl_block_categories" ON public.finance_pnl_block_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
