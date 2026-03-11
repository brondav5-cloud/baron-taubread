-- ============================================
-- SECURITY FIX: meetings & meeting_tasks RLS
-- Previous: USING (true) = any authenticated user saw ALL companies' data
-- Now: tenant isolation via user_has_company_access_text(company_id)
-- ============================================

-- meetings (company_id TEXT)
DROP POLICY IF EXISTS "auth_all_meetings" ON public.meetings;
CREATE POLICY "meetings_tenant" ON public.meetings
  FOR ALL TO authenticated
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- meeting_tasks (company_id TEXT)
DROP POLICY IF EXISTS "auth_all_meeting_tasks" ON public.meeting_tasks;
CREATE POLICY "meeting_tasks_tenant" ON public.meeting_tasks
  FOR ALL TO authenticated
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));
