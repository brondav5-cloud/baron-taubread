-- ─────────────────────────────────────────────────────────────────────────────
-- bank_transaction_splits
-- Allows splitting a single bank transaction into multiple categorized lines.
-- Useful for: credit card statements (many purchases in one debit),
--             payroll transfers, supplier payments covering multiple categories.
-- When splits exist for a transaction, the P&L uses splits instead of the
-- transaction-level category.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bank_transaction_splits (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid          NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  company_id     uuid          NOT NULL,
  description    text          NOT NULL DEFAULT '',
  supplier_name  text,
  category_id    uuid          REFERENCES public.bank_categories(id) ON DELETE SET NULL,
  amount         numeric(14,2) NOT NULL DEFAULT 0,
  notes          text,
  sort_order     int           NOT NULL DEFAULT 0,
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bts_transaction ON public.bank_transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_bts_company     ON public.bank_transaction_splits(company_id);

ALTER TABLE public.bank_transaction_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_bank_transaction_splits"
  ON public.bank_transaction_splits
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
