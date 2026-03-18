-- ============================================
-- Tasks: scheduling + progress tracking
-- ============================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS expected_completion_at timestamptz,
  ADD COLUMN IF NOT EXISTS progress_updates jsonb NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_tasks_starts_at
  ON public.tasks (starts_at);
