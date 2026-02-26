-- ============================================================
-- Accounting Ledger System — Migration 001
-- Run this in Supabase SQL Editor or via /api/accounting/setup
-- ============================================================

-- ── uploaded_files ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  year        INTEGER NOT NULL,
  month       INTEGER,
  file_type   TEXT NOT NULL CHECK (file_type IN ('yearly', 'monthly')),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  row_count   INTEGER,
  status      TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
  error_msg   TEXT
);

ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_uploaded_files" ON public.uploaded_files;
CREATE POLICY "rls_uploaded_files" ON public.uploaded_files
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── accounts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code               TEXT NOT NULL,
  name               TEXT NOT NULL,
  latest_group_code  TEXT,
  account_type       TEXT NOT NULL CHECK (account_type IN ('revenue', 'expense')),
  UNIQUE (user_id, code)
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_accounts" ON public.accounts;
CREATE POLICY "rls_accounts" ON public.accounts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── transactions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id               UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  account_id            UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  group_code            TEXT NOT NULL,
  original_account_name TEXT,
  transaction_date      DATE NOT NULL,
  value_date            DATE,
  debit                 NUMERIC(15,2) DEFAULT 0,
  credit                NUMERIC(15,2) DEFAULT 0,
  description           TEXT,
  counter_account       TEXT,
  reference_number      TEXT,
  header_number         TEXT,
  movement_number       TEXT
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_transactions" ON public.transactions;
CREATE POLICY "rls_transactions" ON public.transactions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Deduplication index using COALESCE to handle NULLs correctly
CREATE UNIQUE INDEX IF NOT EXISTS transactions_dedup_idx
  ON public.transactions (
    user_id,
    account_id,
    COALESCE(header_number, ''),
    COALESCE(movement_number, ''),
    transaction_date,
    COALESCE(debit::TEXT, '0'),
    COALESCE(credit::TEXT, '0')
  );

CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions (user_id, transaction_date);
CREATE INDEX IF NOT EXISTS transactions_account_idx ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS transactions_file_idx ON public.transactions (file_id);

-- ── transaction_overrides ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transaction_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_type  TEXT NOT NULL CHECK (override_type IN ('amount', 'category', 'note', 'exclude')),
  original_value TEXT,
  new_value      TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (transaction_id, override_type)
);

ALTER TABLE public.transaction_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_transaction_overrides" ON public.transaction_overrides;
CREATE POLICY "rls_transaction_overrides" ON public.transaction_overrides
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── custom_groups ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_groups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  display_order  INTEGER DEFAULT 0,
  color          TEXT DEFAULT '#6B7280',
  group_codes    TEXT[] NOT NULL DEFAULT '{}',
  parent_section TEXT NOT NULL CHECK (parent_section IN (
    'cost_of_goods', 'operating', 'admin', 'finance', 'other'
  ))
);

ALTER TABLE public.custom_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_custom_groups" ON public.custom_groups;
CREATE POLICY "rls_custom_groups" ON public.custom_groups
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── custom_tags ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_tags (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  color   TEXT NOT NULL DEFAULT '#6B7280',
  icon    TEXT
);

ALTER TABLE public.custom_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_custom_tags" ON public.custom_tags;
CREATE POLICY "rls_custom_tags" ON public.custom_tags
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── account_tags ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.account_tags (
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES public.custom_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (account_id, tag_id)
);

ALTER TABLE public.account_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_account_tags" ON public.account_tags;
CREATE POLICY "rls_account_tags" ON public.account_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid())
  );

-- ── counter_account_names ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.counter_account_names (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counter_account_code TEXT NOT NULL,
  display_name         TEXT NOT NULL,
  UNIQUE (user_id, counter_account_code)
);

ALTER TABLE public.counter_account_names ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_counter_account_names" ON public.counter_account_names;
CREATE POLICY "rls_counter_account_names" ON public.counter_account_names
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── account_classification_overrides ────────────────────────
CREATE TABLE IF NOT EXISTS public.account_classification_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  custom_group_id UUID NOT NULL REFERENCES public.custom_groups(id) ON DELETE CASCADE,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, account_id)
);

ALTER TABLE public.account_classification_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_account_classification_overrides" ON public.account_classification_overrides;
CREATE POLICY "rls_account_classification_overrides" ON public.account_classification_overrides
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── alert_rules ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  rule_type       TEXT NOT NULL CHECK (rule_type IN (
    'monthly_change_pct',
    'yearly_change_pct',
    'absolute_threshold',
    'consecutive_increase'
  )),
  threshold_value NUMERIC,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_alert_rules" ON public.alert_rules;
CREATE POLICY "rls_alert_rules" ON public.alert_rules
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Helper function: seed default custom_groups for a new user
-- Called from application code after first setup
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_default_custom_groups(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.custom_groups (user_id, name, group_codes, parent_section, display_order, color)
  VALUES
    (p_user_id, 'קניות חומרי גלם',        ARRAY['700','701'],      'cost_of_goods', 1,  '#EF4444'),
    (p_user_id, 'הוצאות ייצור',           ARRAY['702'],            'cost_of_goods', 2,  '#F97316'),
    (p_user_id, 'שכר ייצור ואריזה',       ARRAY['705','706'],      'cost_of_goods', 3,  '#EAB308'),
    (p_user_id, 'אחזקה ותפעול',           ARRAY['703'],            'operating',     4,  '#3B82F6'),
    (p_user_id, 'קבלני משנה',             ARRAY['704'],            'operating',     5,  '#6366F1'),
    (p_user_id, 'שכר ליקוט ונהגים',       ARRAY['707','708'],      'operating',     6,  '#8B5CF6'),
    (p_user_id, 'הוצאות רכב',             ARRAY['714'],            'operating',     7,  '#EC4899'),
    (p_user_id, 'שכר הנהלה ומחסן',        ARRAY['712','713'],      'admin',         8,  '#10B981'),
    (p_user_id, 'הוצאות כלליות',          ARRAY['715','716'],      'admin',         9,  '#14B8A6'),
    (p_user_id, 'הוצאות מימון',           ARRAY['717','718'],      'finance',       10, '#64748B')
  ON CONFLICT DO NOTHING;
END;
$$;
