-- Add manual reporting date override for bank transactions.
-- effective_date is generated and used for all finance reports/filtering.

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS reporting_date date;

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS effective_date date
  GENERATED ALWAYS AS (COALESCE(reporting_date, date)) STORED;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_effective_date
  ON public.bank_transactions(effective_date);
