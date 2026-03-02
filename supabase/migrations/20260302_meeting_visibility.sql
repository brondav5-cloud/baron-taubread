-- ============================================
-- MEETING VISIBILITY & PRIVATE ACCESS
-- ============================================

-- Add visibility column to meetings
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'participants_only', 'restricted'));

-- Add allowed_viewers: JSON array of user ID strings
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS allowed_viewers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Drop the old permissive policy
DROP POLICY IF EXISTS "auth_all_meetings" ON public.meetings;

-- ── SELECT: smart visibility ─────────────────────────────────
CREATE POLICY "meetings_select" ON public.meetings
  FOR SELECT TO authenticated
  USING (
    -- super_admin sees all meetings everywhere
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'super_admin'

    OR
    -- creator always sees their own meeting
    created_by = auth.uid()::text

    OR
    -- admin sees all meetings in their own company
    (
      (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin'
      AND company_id = (SELECT company_id::text FROM public.users WHERE id = auth.uid() LIMIT 1)
    )

    OR
    -- public meeting in user's own company
    (
      visibility = 'public'
      AND company_id = (SELECT company_id::text FROM public.users WHERE id = auth.uid() LIMIT 1)
    )

    OR
    -- participants_only: user appears in participants array (works cross-company)
    (
      visibility = 'participants_only'
      AND participants @> jsonb_build_array(jsonb_build_object('userId', auth.uid()::text))
    )

    OR
    -- restricted: user is in allowed_viewers array (works cross-company)
    (
      visibility = 'restricted'
      AND allowed_viewers @> jsonb_build_array(auth.uid()::text)
    )
  );

-- ── INSERT: only within own company (or super_admin) ─────────
CREATE POLICY "meetings_insert" ON public.meetings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id::text FROM public.users WHERE id = auth.uid() LIMIT 1)
    OR (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );

-- ── UPDATE: creator or admin/super_admin ─────────────────────
CREATE POLICY "meetings_update" ON public.meetings
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('admin', 'super_admin')
    OR created_by = auth.uid()::text
  )
  WITH CHECK (true);

-- ── DELETE: creator or admin/super_admin ─────────────────────
CREATE POLICY "meetings_delete" ON public.meetings
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('admin', 'super_admin')
    OR created_by = auth.uid()::text
  );

-- Index for allowed_viewers (GIN for JSONB contains queries)
CREATE INDEX IF NOT EXISTS idx_meetings_allowed_viewers ON public.meetings USING GIN (allowed_viewers);
CREATE INDEX IF NOT EXISTS idx_meetings_participants ON public.meetings USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_meetings_visibility ON public.meetings (visibility);
