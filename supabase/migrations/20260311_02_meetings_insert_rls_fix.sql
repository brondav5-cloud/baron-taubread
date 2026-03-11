-- ============================================================
-- FIX: meetings INSERT RLS — works for all users
-- Problem: meetings_insert checked users.company_id (NULL for
--          users created after the backfill migration), while
--          meetings_tenant checked user_companies (may also miss
--          newly created users). Both failing → RLS error.
-- Fix:
--   1. Ensure every existing user has a user_companies row
--   2. Drop conflicting INSERT policy
--   3. Create a single robust INSERT policy
-- ============================================================

-- 1. Backfill any users missing from user_companies
INSERT INTO public.user_companies (user_id, company_id, role)
SELECT u.id, u.company_id, COALESCE(u.role, 'viewer')
FROM public.users u
WHERE u.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = u.id AND uc.company_id = u.company_id
  );

-- 2. Drop both old INSERT / ALL policies that were conflicting
DROP POLICY IF EXISTS "meetings_insert" ON public.meetings;
DROP POLICY IF EXISTS "meetings_tenant" ON public.meetings;

-- 3. Single robust INSERT policy
--    Allows insert when the company_id is one the user belongs to
--    (via user_companies) OR their direct users.company_id matches,
--    OR they are super_admin.
CREATE POLICY "meetings_insert_v2" ON public.meetings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_company_access_text(company_id)
    OR company_id = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid() LIMIT 1
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );

-- 4. Re-create FOR ALL for UPDATE / DELETE (was previously covered by meetings_tenant)
DROP POLICY IF EXISTS "meetings_update" ON public.meetings;
DROP POLICY IF EXISTS "meetings_delete" ON public.meetings;

CREATE POLICY "meetings_update_v2" ON public.meetings
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()::text
    OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1)
       IN ('admin', 'super_admin')
  )
  WITH CHECK (
    user_has_company_access_text(company_id)
    OR company_id = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid() LIMIT 1
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );

CREATE POLICY "meetings_delete_v2" ON public.meetings
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()::text
    OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1)
       IN ('admin', 'super_admin')
  );

-- Same fix for meeting_tasks
DROP POLICY IF EXISTS "meeting_tasks_tenant" ON public.meeting_tasks;

CREATE POLICY "meeting_tasks_insert_v2" ON public.meeting_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_company_access_text(company_id)
    OR company_id = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid() LIMIT 1
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );

CREATE POLICY "meeting_tasks_all_v2" ON public.meeting_tasks
  FOR ALL TO authenticated
  USING (
    user_has_company_access_text(company_id)
    OR company_id = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid() LIMIT 1
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  )
  WITH CHECK (
    user_has_company_access_text(company_id)
    OR company_id = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid() LIMIT 1
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );
