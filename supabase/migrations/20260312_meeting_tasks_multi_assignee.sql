-- Add multi-assignee support to meeting_tasks
-- Keeps old single-value columns for backward compatibility

ALTER TABLE public.meeting_tasks
  ADD COLUMN IF NOT EXISTS assignee_user_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assignee_names TEXT[] DEFAULT '{}';

-- Backfill from existing single-value columns
UPDATE public.meeting_tasks
SET
  assignee_user_ids = ARRAY[assignee_user_id],
  assignee_names    = ARRAY[assignee_name]
WHERE
  assignee_user_ids = '{}' OR assignee_user_ids IS NULL;
