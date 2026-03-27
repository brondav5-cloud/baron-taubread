-- Transaction merging support
-- Allows grouping multiple "העברה ברשימה" entries into one logical transaction

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL;

-- Index for efficient lookup of children by parent
CREATE INDEX IF NOT EXISTS idx_bank_txs_merged
  ON public.bank_transactions(merged_into_id)
  WHERE merged_into_id IS NOT NULL;
