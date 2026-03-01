-- ============================================================
-- Migration: revenue_counter_accounts
-- Purpose: Mark specific counter_accounts (H field) as "customers" (not suppliers)
-- A counter_account marked here will be treated as a customer/revenue source
-- and excluded from suppliers list. Customers appear in their own tab.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.revenue_counter_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counter_account TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, counter_account)
);

CREATE INDEX IF NOT EXISTS revenue_counter_accounts_company_idx 
  ON public.revenue_counter_accounts(company_id);

ALTER TABLE public.revenue_counter_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_revenue_counter_accounts" ON public.revenue_counter_accounts;
CREATE POLICY "rls_revenue_counter_accounts" ON public.revenue_counter_accounts
  FOR ALL TO authenticated
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));
