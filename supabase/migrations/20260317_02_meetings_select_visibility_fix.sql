-- ============================================================
-- FIX: meetings SELECT visibility policy for multi-company users
-- Problem:
--   meetings_select used users.company_id for some checks.
--   In multi-company scenarios this can hide public meetings
--   from valid users.
-- Fix:
--   Use user_has_company_access_text(company_id) for own-company access.
-- ============================================================

DROP POLICY IF EXISTS "meetings_select" ON public.meetings;

CREATE POLICY "meetings_select" ON public.meetings
  FOR SELECT TO authenticated
  USING (
    -- super_admin sees all
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'super_admin'

    OR
    -- creator always sees own meeting
    created_by = auth.uid()::text

    OR
    -- admin sees all meetings in companies they can access
    (
      (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin'
      AND user_has_company_access_text(company_id)
    )

    OR
    -- public meetings are visible to all users with company access
    (
      visibility = 'public'
      AND user_has_company_access_text(company_id)
    )

    OR
    -- participants_only: internal participant can see (including cross-company)
    (
      visibility = 'participants_only'
      AND participants @> jsonb_build_array(jsonb_build_object('userId', auth.uid()::text))
    )

    OR
    -- restricted: explicit allowed viewers
    (
      visibility = 'restricted'
      AND allowed_viewers @> jsonb_build_array(auth.uid()::text)
    )
  );
