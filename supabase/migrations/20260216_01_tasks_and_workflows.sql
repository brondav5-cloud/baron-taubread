-- =============================================
-- Tasks table - משימות רגילות
-- =============================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  task_type text NOT NULL CHECK (task_type IN ('store', 'general')),
  created_by text NOT NULL,
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  visit_id text,
  store_id integer,
  store_name text,
  category_id text NOT NULL,
  category_name text NOT NULL,
  category_icon text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('urgent', 'normal', 'low')),
  title text NOT NULL,
  description text DEFAULT '',
  photos jsonb DEFAULT '[]',
  status text NOT NULL CHECK (status IN ('new', 'seen', 'in_progress', 'done', 'approved', 'rejected')),
  checklist jsonb DEFAULT '[]',
  comments jsonb DEFAULT '[]',
  history jsonb DEFAULT '[]',
  assignees jsonb DEFAULT '[]',
  handler_response text,
  handler_photos jsonb DEFAULT '[]',
  handled_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  due_date timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks (company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON public.tasks (company_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_company_store ON public.tasks (company_id, store_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_created ON public.tasks (company_id, created_at DESC);

-- =============================================
-- Workflows table - משימות מורכבות
-- =============================================

CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  title text NOT NULL,
  description text,
  created_by text NOT NULL,
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  store_id integer,
  store_name text,
  priority text NOT NULL CHECK (priority IN ('urgent', 'normal', 'low')),
  status text NOT NULL CHECK (status IN ('active', 'awaiting_approval', 'completed', 'rejected', 'cancelled')),
  due_date timestamptz NOT NULL,
  steps jsonb DEFAULT '[]',
  comments jsonb DEFAULT '[]',
  history jsonb DEFAULT '[]',
  approved_at timestamptz,
  approved_by text,
  approved_by_name text,
  rejected_at timestamptz,
  rejected_by text,
  rejected_by_name text,
  rejection_reason text
);

CREATE INDEX IF NOT EXISTS idx_workflows_company_id ON public.workflows (company_id);
CREATE INDEX IF NOT EXISTS idx_workflows_company_status ON public.workflows (company_id, status);
CREATE INDEX IF NOT EXISTS idx_workflows_company_created ON public.workflows (company_id, created_at DESC);
