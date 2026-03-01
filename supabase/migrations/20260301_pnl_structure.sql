-- ============================================================
-- Migration: PnL Structure — group_labels + pnl_custom_sections
-- group_labels: custom display names for group_codes
-- pnl_custom_sections: user-defined sub-sections within each ParentSection
--   parent_section can be: "revenue" | "cost_of_goods" | "operating" | "admin" | "finance" | "other"
-- ============================================================

-- 1. group_labels
CREATE TABLE IF NOT EXISTS public.group_labels (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  group_code TEXT NOT NULL,
  custom_label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (company_id, group_code)
);

CREATE INDEX IF NOT EXISTS group_labels_company_idx ON public.group_labels(company_id);

ALTER TABLE public.group_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_group_labels" ON public.group_labels;
CREATE POLICY "rls_group_labels" ON public.group_labels
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- 2. pnl_custom_sections
CREATE TABLE IF NOT EXISTS public.pnl_custom_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_section TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  group_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pnl_custom_sections_company_idx ON public.pnl_custom_sections(company_id);

ALTER TABLE public.pnl_custom_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_pnl_custom_sections" ON public.pnl_custom_sections;
CREATE POLICY "rls_pnl_custom_sections" ON public.pnl_custom_sections
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));
