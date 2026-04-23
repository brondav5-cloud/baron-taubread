-- Soft delete support for bank transactions
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Recreate dedupe index so deleted rows do not block re-import.
DROP INDEX IF EXISTS public.uidx_bank_transactions_dedup;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_bank_transactions_dedup
  ON public.bank_transactions(bank_account_id, date, reference, debit, credit)
  WHERE reference <> '' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_deleted_at
  ON public.bank_transactions(deleted_at);
