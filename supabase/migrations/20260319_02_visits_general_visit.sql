-- =============================================
-- General visits (ביקור כללי) - not tied to a store
-- e.g. team meeting, errands, other activities
-- =============================================

-- Add visit_type and general_activity_label; make store fields nullable
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS visit_type text NOT NULL DEFAULT 'store'
    CHECK (visit_type IN ('store', 'general')),
  ADD COLUMN IF NOT EXISTS general_activity_label text;

-- Allow null store for general visits (existing rows stay store visits)
ALTER TABLE public.visits
  ALTER COLUMN store_external_id DROP NOT NULL,
  ALTER COLUMN store_name DROP NOT NULL,
  ALTER COLUMN store_city DROP NOT NULL;

-- Constraint: store visits must have store fields; general must have label
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_store_or_general_check;
ALTER TABLE public.visits ADD CONSTRAINT visits_store_or_general_check CHECK (
  (visit_type = 'store' AND store_external_id IS NOT NULL AND store_name IS NOT NULL)
  OR (visit_type = 'general' AND general_activity_label IS NOT NULL AND general_activity_label <> '')
);

-- Index for filtering by visit type
CREATE INDEX IF NOT EXISTS idx_visits_visit_type ON public.visits (company_id, visit_type);

COMMENT ON COLUMN public.visits.visit_type IS 'store = visit to a store; general = activity not tied to a store (e.g. team meeting, errands)';
COMMENT ON COLUMN public.visits.general_activity_label IS 'For visit_type=general: e.g. ישיבת צוות, שליחות, משימה כללית';
