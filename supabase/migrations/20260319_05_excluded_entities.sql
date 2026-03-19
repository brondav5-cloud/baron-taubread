-- ============================================================
-- excluded_entities
-- Configurable list of networks / drivers / stores / agents
-- that should be excluded from product-delivery processing.
--
-- WHY: Previously "בלנדר איגור" was hardcoded in the processor.
-- This table allows admins to manage exclusions without touching
-- code. Each exclusion is per-company so multi-tenant is supported.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.excluded_entities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- What kind of entity is excluded
  entity_type TEXT        NOT NULL CHECK (entity_type IN ('network', 'driver', 'store', 'agent')),

  -- The exact value to match (case-sensitive, trimmed)
  entity_value TEXT       NOT NULL,

  -- Human-readable reason (optional, for audit trail)
  reason      TEXT,

  -- Can be toggled off without deleting
  active      BOOLEAN     NOT NULL DEFAULT TRUE,

  created_by  UUID        REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, entity_type, entity_value)
);

CREATE INDEX IF NOT EXISTS idx_excluded_entities_company
  ON public.excluded_entities (company_id)
  WHERE active = TRUE;

-- RLS
ALTER TABLE public.excluded_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_excluded_entities"
  ON public.excluded_entities
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  );
