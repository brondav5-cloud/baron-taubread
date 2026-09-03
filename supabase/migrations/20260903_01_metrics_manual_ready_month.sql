-- Allow unlocking the last closed month for metrics before the 15th
-- (returns often arrive mid-month; ops can mark a month as ready).

ALTER TABLE public.data_metadata
  ADD COLUMN IF NOT EXISTS metrics_manual_ready_month text;

COMMENT ON COLUMN public.data_metadata.metrics_manual_ready_month IS
  'YYYYMM of the last closed month unlocked early for metrics/alerts';
