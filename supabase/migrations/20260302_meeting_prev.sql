-- ============================================
-- MEETING CONTINUATION LINKING
-- ============================================

-- Link a meeting as a continuation of a previous meeting
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS prev_meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_prev ON public.meetings(prev_meeting_id);
