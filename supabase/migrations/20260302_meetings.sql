-- ============================================
-- MEETINGS SYSTEM
-- ============================================

-- Main meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'team'
    CHECK (meeting_type IN ('team', 'management', 'one_on_one')),
  meeting_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  participants JSONB DEFAULT '[]'::jsonb,
  agenda_items JSONB DEFAULT '[]'::jsonb,
  decisions TEXT,
  next_meeting_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'final')),
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks created during meetings (junction)
CREATE TABLE IF NOT EXISTS public.meeting_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  agenda_item_index INTEGER,
  task_id TEXT NOT NULL,
  assignee_user_id TEXT NOT NULL,
  assignee_name TEXT NOT NULL,
  task_title TEXT NOT NULL,
  due_date TEXT,
  priority TEXT DEFAULT 'normal',
  company_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_meetings" ON public.meetings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_meeting_tasks" ON public.meeting_tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_company ON public.meetings(company_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON public.meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_tasks_meeting ON public.meeting_tasks(meeting_id);
