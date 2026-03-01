-- ============================================================
-- Migration: Add company_id to all accounting tables
-- This enables multi-company support for the P&L module
-- Uses UUID + FK for consistency with companies table
-- ============================================================

-- ── Step 1: Add company_id column (UUID, REFERENCES companies) ────

ALTER TABLE public.uploaded_files 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.transaction_overrides 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.custom_groups 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.custom_tags 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.counter_account_names 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.account_classification_overrides 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

ALTER TABLE public.alert_rules 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- ── Step 2: Backfill company_id ───────────────────────────────
-- Priority: user_companies (first company) → users.company_id → first company in system

CREATE OR REPLACE FUNCTION public._mig_backfill_company_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT uc.company_id INTO v_company_id
  FROM public.user_companies uc WHERE uc.user_id = p_user_id LIMIT 1;
  IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;

  SELECT u.company_id INTO v_company_id
  FROM public.users u WHERE u.id = p_user_id;
  IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;

  SELECT c.id INTO v_company_id
  FROM public.companies c ORDER BY c.created_at LIMIT 1;
  RETURN v_company_id;
END;
$$;

UPDATE public.uploaded_files uf
SET company_id = public._mig_backfill_company_id(uf.user_id)
WHERE uf.company_id IS NULL;

UPDATE public.accounts a
SET company_id = public._mig_backfill_company_id(a.user_id)
WHERE a.company_id IS NULL;

UPDATE public.transactions t
SET company_id = public._mig_backfill_company_id(t.user_id)
WHERE t.company_id IS NULL;

UPDATE public.transaction_overrides tov
SET company_id = public._mig_backfill_company_id(tov.user_id)
WHERE tov.company_id IS NULL;

UPDATE public.custom_groups cg
SET company_id = public._mig_backfill_company_id(cg.user_id)
WHERE cg.company_id IS NULL;

UPDATE public.custom_tags ct
SET company_id = public._mig_backfill_company_id(ct.user_id)
WHERE ct.company_id IS NULL;

UPDATE public.counter_account_names can
SET company_id = public._mig_backfill_company_id(can.user_id)
WHERE can.company_id IS NULL;

UPDATE public.account_classification_overrides aco
SET company_id = public._mig_backfill_company_id(aco.user_id)
WHERE aco.company_id IS NULL;

UPDATE public.alert_rules ar
SET company_id = public._mig_backfill_company_id(ar.user_id)
WHERE ar.company_id IS NULL;

-- Fallback: any remaining NULLs → first company in system (orphan data)
UPDATE public.uploaded_files SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.accounts SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.transactions SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.transaction_overrides SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.custom_groups SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.custom_tags SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.counter_account_names SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.account_classification_overrides SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.alert_rules SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

DROP FUNCTION public._mig_backfill_company_id(UUID);

-- ── Step 3: Make company_id NOT NULL after backfill ───────────

ALTER TABLE public.uploaded_files 
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.accounts 
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.transactions 
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.transaction_overrides 
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.custom_groups 
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.custom_tags 
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.counter_account_names 
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.account_classification_overrides 
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.alert_rules 
  ALTER COLUMN company_id SET NOT NULL;

-- ── Step 4: Update UNIQUE constraints ─────────────────────────

-- accounts: unique code per company (not per user)
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_user_id_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_company_code_idx 
  ON public.accounts (company_id, code);

-- counter_account_names: unique per company
ALTER TABLE public.counter_account_names DROP CONSTRAINT IF EXISTS counter_account_names_user_id_counter_account_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS counter_account_names_company_code_idx 
  ON public.counter_account_names (company_id, counter_account_code);

-- account_classification_overrides: unique per company+account
ALTER TABLE public.account_classification_overrides DROP CONSTRAINT IF EXISTS account_classification_overrides_user_id_account_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS account_classification_overrides_company_account_idx 
  ON public.account_classification_overrides (company_id, account_id);

-- transactions dedup index: update to use company_id
DROP INDEX IF EXISTS public.transactions_dedup_idx;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_dedup_idx
  ON public.transactions (
    company_id,
    account_id,
    COALESCE(header_number, ''),
    COALESCE(movement_number, ''),
    transaction_date,
    COALESCE(debit::TEXT, '0'),
    COALESCE(credit::TEXT, '0')
  );

-- ── Step 5: Update indexes ────────────────────────────────────

DROP INDEX IF EXISTS public.transactions_date_idx;
CREATE INDEX IF NOT EXISTS transactions_company_date_idx 
  ON public.transactions (company_id, transaction_date);

CREATE INDEX IF NOT EXISTS uploaded_files_company_idx 
  ON public.uploaded_files (company_id);

CREATE INDEX IF NOT EXISTS accounts_company_idx 
  ON public.accounts (company_id);

CREATE INDEX IF NOT EXISTS custom_groups_company_idx 
  ON public.custom_groups (company_id);

CREATE INDEX IF NOT EXISTS custom_tags_company_idx 
  ON public.custom_tags (company_id);

CREATE INDEX IF NOT EXISTS alert_rules_company_idx 
  ON public.alert_rules (company_id);

-- ── Step 6: Update RLS policies ───────────────────────────────
-- Uses user_has_company_access(uuid) from 20260223_02_rls_user_companies

-- uploaded_files
DROP POLICY IF EXISTS "rls_uploaded_files" ON public.uploaded_files;
CREATE POLICY "rls_uploaded_files" ON public.uploaded_files
  FOR ALL TO authenticated 
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- accounts
DROP POLICY IF EXISTS "rls_accounts" ON public.accounts;
CREATE POLICY "rls_accounts" ON public.accounts
  FOR ALL TO authenticated 
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- transactions
DROP POLICY IF EXISTS "rls_transactions" ON public.transactions;
CREATE POLICY "rls_transactions" ON public.transactions
  FOR ALL TO authenticated 
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- transaction_overrides
DROP POLICY IF EXISTS "rls_transaction_overrides" ON public.transaction_overrides;
CREATE POLICY "rls_transaction_overrides" ON public.transaction_overrides
  FOR ALL TO authenticated 
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- custom_groups
DROP POLICY IF EXISTS "rls_custom_groups" ON public.custom_groups;
CREATE POLICY "rls_custom_groups" ON public.custom_groups
  FOR ALL TO authenticated 
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- custom_tags
DROP POLICY IF EXISTS "rls_custom_tags" ON public.custom_tags;
CREATE POLICY "rls_custom_tags" ON public.custom_tags
  FOR ALL TO authenticated 
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- counter_account_names
DROP POLICY IF EXISTS "rls_counter_account_names" ON public.counter_account_names;
CREATE POLICY "rls_counter_account_names" ON public.counter_account_names
  FOR ALL TO authenticated 
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- account_classification_overrides
DROP POLICY IF EXISTS "rls_account_classification_overrides" ON public.account_classification_overrides;
CREATE POLICY "rls_account_classification_overrides" ON public.account_classification_overrides
  FOR ALL TO authenticated 
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- alert_rules
DROP POLICY IF EXISTS "rls_alert_rules" ON public.alert_rules;
CREATE POLICY "rls_alert_rules" ON public.alert_rules
  FOR ALL TO authenticated 
  USING (public.user_has_company_access(company_id))
  WITH CHECK (public.user_has_company_access(company_id));

-- account_tags (via accounts FK)
DROP POLICY IF EXISTS "rls_account_tags" ON public.account_tags;
CREATE POLICY "rls_account_tags" ON public.account_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND public.user_has_company_access(a.company_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND public.user_has_company_access(a.company_id))
  );

-- ── Step 7: Update seed function ──────────────────────────────
-- Seed with EMPTY group_codes/account_codes — user assigns at upload time or via mapping UI

DROP FUNCTION IF EXISTS public.seed_default_custom_groups(TEXT);
DROP FUNCTION IF EXISTS public.seed_default_custom_groups(UUID);

CREATE OR REPLACE FUNCTION public.seed_default_custom_groups(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.custom_groups WHERE company_id = p_company_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- Get a user from user_companies for this company (required for user_id NOT NULL)
  SELECT user_id INTO v_user_id
  FROM public.user_companies WHERE company_id = p_company_id LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN;  -- No user in company, cannot seed
  END IF;

  INSERT INTO public.custom_groups (company_id, user_id, name, group_codes, account_codes, parent_section, display_order, color)
  VALUES
    (p_company_id, v_user_id, 'קניות חומרי גלם',   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'cost_of_goods', 1,  '#EF4444'),
    (p_company_id, v_user_id, 'הוצאות ייצור',      ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'cost_of_goods', 2,  '#F97316'),
    (p_company_id, v_user_id, 'שכר ייצור ואריזה',  ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'cost_of_goods', 3,  '#EAB308'),
    (p_company_id, v_user_id, 'אחזקה ותפעול',      ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'operating',     4,  '#3B82F6'),
    (p_company_id, v_user_id, 'קבלני משנה',        ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'operating',     5,  '#6366F1'),
    (p_company_id, v_user_id, 'שכר ליקוט ונהגים',  ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'operating',     6,  '#8B5CF6'),
    (p_company_id, v_user_id, 'הוצאות רכב',        ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'operating',     7,  '#EC4899'),
    (p_company_id, v_user_id, 'שכר הנהלה ומחסן',   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'admin',         8,  '#10B981'),
    (p_company_id, v_user_id, 'הוצאות כלליות',     ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'admin',         9,  '#14B8A6'),
    (p_company_id, v_user_id, 'הוצאות מימון',      ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'finance',       10, '#64748B');
END;
$$;
