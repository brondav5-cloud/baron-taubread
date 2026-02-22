-- Fix visits table: drop if wrong schema, recreate correctly
-- Run this in Supabase SQL Editor

DROP TABLE IF EXISTS public.visits;

CREATE TABLE public.visits (
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

CREATE INDEX idx_visits_company_id ON public.visits (company_id);
CREATE INDEX idx_visits_company_store ON public.visits (company_id, store_external_id);
CREATE INDEX idx_visits_company_date ON public.visits (company_id, date DESC);
