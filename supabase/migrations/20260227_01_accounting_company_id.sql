-- ============================================================
-- Migration: Add company_id to all accounting tables
-- This enables multi-company support for the P&L module
-- ============================================================

-- ── Step 1: Add company_id column to all accounting tables ────

ALTER TABLE public.uploaded_files 
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE public.transaction_overrides 
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE public.custom_groups 
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE public.custom_tags 
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE public.counter_account_names 
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE public.account_classification_overrides 
  ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE public.alert_rules 
  ADD COLUMN IF NOT EXISTS company_id TEXT;

-- ── Step 2: Backfill company_id from users.company_id ─────────
-- For existing data, use the user's primary company_id

UPDATE public.uploaded_files uf
SET company_id = u.company_id
FROM public.users u
WHERE uf.user_id = u.id AND uf.company_id IS NULL;

UPDATE public.accounts a
SET company_id = u.company_id
FROM public.users u
WHERE a.user_id = u.id AND a.company_id IS NULL;

UPDATE public.transactions t
SET company_id = u.company_id
FROM public.users u
WHERE t.user_id = u.id AND t.company_id IS NULL;

UPDATE public.transaction_overrides tov
SET company_id = u.company_id
FROM public.users u
WHERE tov.user_id = u.id AND tov.company_id IS NULL;

UPDATE public.custom_groups cg
SET company_id = u.company_id
FROM public.users u
WHERE cg.user_id = u.id AND cg.company_id IS NULL;

UPDATE public.custom_tags ct
SET company_id = u.company_id
FROM public.users u
WHERE ct.user_id = u.id AND ct.company_id IS NULL;

UPDATE public.counter_account_names can
SET company_id = u.company_id
FROM public.users u
WHERE can.user_id = u.id AND can.company_id IS NULL;

UPDATE public.account_classification_overrides aco
SET company_id = u.company_id
FROM public.users u
WHERE aco.user_id = u.id AND aco.company_id IS NULL;

UPDATE public.alert_rules ar
SET company_id = u.company_id
FROM public.users u
WHERE ar.user_id = u.id AND ar.company_id IS NULL;

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
-- Allow access if user belongs to the company (via user_companies) or is super_admin

-- Helper function to check company membership
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check if super_admin
  SELECT role INTO v_user_role FROM public.users WHERE id = auth.uid();
  IF v_user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check user_companies membership
  RETURN EXISTS (
    SELECT 1 FROM public.user_companies 
    WHERE user_id = auth.uid() AND company_id = p_company_id
  );
END;
$$;

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

CREATE OR REPLACE FUNCTION public.seed_default_custom_groups(p_company_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.custom_groups (company_id, name, group_codes, parent_section, display_order, color)
  VALUES
    (p_company_id, 'קניות חומרי גלם',        ARRAY['700','701'],      'cost_of_goods', 1,  '#EF4444'),
    (p_company_id, 'הוצאות ייצור',           ARRAY['702'],            'cost_of_goods', 2,  '#F97316'),
    (p_company_id, 'שכר ייצור ואריזה',       ARRAY['705','706'],      'cost_of_goods', 3,  '#EAB308'),
    (p_company_id, 'אחזקה ותפעול',           ARRAY['703'],            'operating',     4,  '#3B82F6'),
    (p_company_id, 'קבלני משנה',             ARRAY['704'],            'operating',     5,  '#6366F1'),
    (p_company_id, 'שכר ליקוט ונהגים',       ARRAY['707','708'],      'operating',     6,  '#8B5CF6'),
    (p_company_id, 'הוצאות רכב',             ARRAY['714'],            'operating',     7,  '#EC4899'),
    (p_company_id, 'שכר הנהלה ומחסן',        ARRAY['712','713'],      'admin',         8,  '#10B981'),
    (p_company_id, 'הוצאות כלליות',          ARRAY['715','716'],      'admin',         9,  '#14B8A6'),
    (p_company_id, 'הוצאות מימון',           ARRAY['717','718'],      'finance',       10, '#64748B')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Drop old function signature if exists
DROP FUNCTION IF EXISTS public.seed_default_custom_groups(UUID);
