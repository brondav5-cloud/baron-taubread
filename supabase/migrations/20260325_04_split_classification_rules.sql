-- ─────────────────────────────────────────────────────────────────────────────
-- split_classification_rules
-- Remembers "description keyword → category" mappings for split rows.
-- When a new detail document (credit card / salary) is imported as splits,
-- each row's description is matched against these rules to auto-assign a
-- category — so the user only needs to classify once.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.split_classification_rules (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL,
  match_value  text        NOT NULL,   -- keyword / exact name to match (case-insensitive)
  category_id  uuid        REFERENCES public.bank_categories(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, match_value)
);

CREATE INDEX IF NOT EXISTS idx_scr_company ON public.split_classification_rules(company_id);

ALTER TABLE public.split_classification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_split_classification_rules"
  ON public.split_classification_rules
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
