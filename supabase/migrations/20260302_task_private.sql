-- ============================================
-- TASK PRIVATE VISIBILITY
-- ============================================

-- Add is_private flag (default false = visible to all in company)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Drop old company-only policy
DROP POLICY IF EXISTS "tasks_multi" ON public.tasks;

-- New policy: company access + private visibility check
CREATE POLICY "tasks_visibility" ON public.tasks
  FOR ALL TO authenticated
  USING (
    user_has_company_access_text(company_id)
    AND (
      -- Not private: everyone in company sees it
      is_private = false

      OR
      -- Admin/super_admin always see everything
      (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('admin', 'super_admin')

      OR
      -- Creator always sees their own task
      created_by = auth.uid()::text

      OR
      -- Any assignee sees their task
      assignees @> jsonb_build_array(jsonb_build_object('userId', auth.uid()::text))
    )
  )
  WITH CHECK (user_has_company_access_text(company_id));

-- Index for private tasks
CREATE INDEX IF NOT EXISTS idx_tasks_is_private ON public.tasks (is_private);
