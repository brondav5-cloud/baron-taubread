-- =============================================
-- Visits table - store visit records
-- =============================================

CREATE TABLE IF NOT EXISTS public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  store_external_id integer NOT NULL,
  store_name text NOT NULL,
  store_city text NOT NULL DEFAULT '',
  agent_name text NOT NULL DEFAULT '',
  date date NOT NULL,
  time text,
  notes text DEFAULT '',
  checklist jsonb DEFAULT '[]',
  competitors jsonb DEFAULT '[]',
  photos jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'draft')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_visits_company_id ON public.visits (company_id);
CREATE INDEX IF NOT EXISTS idx_visits_company_store ON public.visits (company_id, store_external_id);
CREATE INDEX IF NOT EXISTS idx_visits_company_date ON public.visits (company_id, date DESC);

-- Application filters by company_id (matches stores/products pattern)
