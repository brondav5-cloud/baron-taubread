-- ============================================================
-- Migration: revenue_account_codes
-- Purpose: Mark specific account_codes as "customer" codes (not supplier codes)
-- Any supplier classified under these codes will be treated as a customer
-- and excluded from suppliers list. Much easier than marking individual H values.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.revenue_account_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, account_code)
);

CREATE INDEX IF NOT EXISTS revenue_account_codes_company_idx 
  ON public.revenue_account_codes(company_id);

ALTER TABLE public.revenue_account_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_revenue_account_codes" ON public.revenue_account_codes;
CREATE POLICY "rls_revenue_account_codes" ON public.revenue_account_codes
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));
