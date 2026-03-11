-- Add multi-assignee support to faults table
ALTER TABLE public.faults
  ADD COLUMN IF NOT EXISTS assigned_to_ids  jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_to_names jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single-assignee data into the new array columns
UPDATE public.faults
SET
  assigned_to_ids  = CASE
    WHEN assigned_to IS NOT NULL AND assigned_to <> ''
    THEN jsonb_build_array(assigned_to)
    ELSE '[]'::jsonb
  END,
  assigned_to_names = CASE
    WHEN assigned_to_name IS NOT NULL AND assigned_to_name <> ''
    THEN jsonb_build_array(assigned_to_name)
    ELSE '[]'::jsonb
  END
WHERE
  assigned_to_ids = '[]'::jsonb
  OR assigned_to_ids IS NULL;
