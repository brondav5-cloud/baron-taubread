-- ============================================================
-- Migration 004 — Alert Results Cache Table
-- Stores computed alert results per user/year
-- Uses user_id (consistent with rest of accounting system)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.alert_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id         UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  account_id      UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  month           INTEGER,  -- NULL = annual alert
  severity        TEXT NOT NULL CHECK (severity IN ('warning', 'critical', 'saving')),
  alert_type      TEXT NOT NULL,
  current_value   NUMERIC(15,2),
  reference_value NUMERIC(15,2),
  change_pct      NUMERIC(8,2),
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  is_dismissed    BOOLEAN DEFAULT false
);

ALTER TABLE public.alert_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_alert_results" ON public.alert_results;
CREATE POLICY "rls_alert_results" ON public.alert_results
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_alert_results_user_year
  ON public.alert_results(user_id, year);

CREATE INDEX IF NOT EXISTS idx_alert_results_severity
  ON public.alert_results(user_id, severity);
