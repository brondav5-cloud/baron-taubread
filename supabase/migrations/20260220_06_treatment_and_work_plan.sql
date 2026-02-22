-- =============================================
-- Store Treatments (חנויות בטיפול)
-- טבלה לניהול חנויות בטיפול + היסטוריה
-- =============================================

CREATE TABLE IF NOT EXISTS public.store_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  store_id integer NOT NULL,
  store_name text NOT NULL,
  store_city text NOT NULL DEFAULT '',
  store_agent text NOT NULL DEFAULT '',
  status_long text NOT NULL DEFAULT 'יציב',
  metric_12v12 numeric DEFAULT 0,
  metric_2v2 numeric DEFAULT 0,
  returns_pct numeric DEFAULT 0,
  reason text NOT NULL CHECK (reason IN ('manual', 'crash', 'decline', 'returns', 'short_term', 'other')),
  treatment_status text NOT NULL DEFAULT 'pending' CHECK (treatment_status IN ('pending', 'in_progress', 'resolved')),
  notes text DEFAULT '',
  added_by text NOT NULL,
  added_by_name text,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text,
  UNIQUE(company_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_treatments_company ON public.store_treatments (company_id);
CREATE INDEX IF NOT EXISTS idx_store_treatments_company_status ON public.store_treatments (company_id, treatment_status);
CREATE INDEX IF NOT EXISTS idx_store_treatments_added_at ON public.store_treatments (company_id, added_at DESC);

-- =============================================
-- Store Treatment History (היסטוריית טיפולים)
-- שמירה של כל השינויים - מתי נוספה, מתי עודכן סטטוס, מתי טופל
-- =============================================

CREATE TABLE IF NOT EXISTS public.store_treatment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  store_id integer NOT NULL,
  store_name text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('added', 'status_updated', 'notes_updated', 'resolved', 'removed')),
  reason text,
  old_status text,
  new_status text,
  notes text,
  created_by text NOT NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_treatment_history_company ON public.store_treatment_history (company_id);
CREATE INDEX IF NOT EXISTS idx_store_treatment_history_store ON public.store_treatment_history (company_id, store_id);
CREATE INDEX IF NOT EXISTS idx_store_treatment_history_date ON public.store_treatment_history (company_id, created_at DESC);

-- =============================================
-- Work Plan Items (תכנון עבודה)
-- פריטי תכנון - ביקורים ומשימות לפי שבוע ויום
-- שמירת היסטוריה - כל שבוע נשמר, ניתן לראות אחורה
-- =============================================

CREATE TABLE IF NOT EXISTS public.work_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  week_key text NOT NULL,
  day integer NOT NULL CHECK (day >= 0 AND day <= 6),
  item_type text NOT NULL CHECK (item_type IN ('visit', 'task')),
  sort_order integer NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  -- For visits
  store_id integer,
  store_name text,
  store_city text,
  store_agent text,
  -- For tasks
  task_title text,
  task_description text
);

CREATE INDEX IF NOT EXISTS idx_work_plan_items_company ON public.work_plan_items (company_id);
CREATE INDEX IF NOT EXISTS idx_work_plan_items_week ON public.work_plan_items (company_id, week_key);
CREATE INDEX IF NOT EXISTS idx_work_plan_items_store ON public.work_plan_items (company_id, store_id) WHERE store_id IS NOT NULL;

-- View: Store visit frequency (חנויות עם הכי הרבה ביקורים)
CREATE OR REPLACE VIEW public.store_visit_frequency AS
SELECT
  company_id,
  store_id,
  store_name,
  COUNT(*) AS visit_count,
  COUNT(DISTINCT week_key) AS weeks_planned,
  MIN(week_key) AS first_planned,
  MAX(week_key) AS last_planned
FROM public.work_plan_items
WHERE item_type = 'visit' AND store_id IS NOT NULL
GROUP BY company_id, store_id, store_name;
