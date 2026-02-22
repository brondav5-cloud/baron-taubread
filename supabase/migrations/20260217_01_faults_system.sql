-- =============================================
-- Fault Types - סוגי תקלות (ניתן לעריכה בהגדרות)
-- =============================================

CREATE TABLE IF NOT EXISTS public.fault_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '⚠️',
  color text DEFAULT 'gray',
  "order" integer NOT NULL DEFAULT 0,
  default_assignee_id text,
  default_assignee_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fault_types_company ON public.fault_types (company_id);

-- =============================================
-- Fault Statuses - סטטוסי תקלה (גמיש, ניתן לעריכה)
-- =============================================

CREATE TABLE IF NOT EXISTS public.fault_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  name text NOT NULL,
  color text DEFAULT 'gray',
  "order" integer NOT NULL DEFAULT 0,
  is_final boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fault_statuses_company ON public.fault_statuses (company_id);

-- =============================================
-- Faults - דיווחי תקלות
-- =============================================

CREATE TABLE IF NOT EXISTS public.faults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  type_id uuid NOT NULL REFERENCES public.fault_types(id),
  status_id uuid NOT NULL REFERENCES public.fault_statuses(id),
  title text NOT NULL,
  description text DEFAULT '',
  reported_by text NOT NULL,
  reported_by_name text NOT NULL,
  assigned_to text NOT NULL,
  assigned_to_name text NOT NULL,
  photos jsonb DEFAULT '[]',
  comments jsonb DEFAULT '[]',
  history jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faults_company ON public.faults (company_id);
CREATE INDEX IF NOT EXISTS idx_faults_type ON public.faults (type_id);
CREATE INDEX IF NOT EXISTS idx_faults_status ON public.faults (status_id);
CREATE INDEX IF NOT EXISTS idx_faults_reported ON public.faults (reported_by);
CREATE INDEX IF NOT EXISTS idx_faults_assigned ON public.faults (assigned_to);
CREATE INDEX IF NOT EXISTS idx_faults_created ON public.faults (company_id, created_at DESC);

-- Default fault statuses (per company - inserted on first use via app)
-- Default fault types - user adds via settings
