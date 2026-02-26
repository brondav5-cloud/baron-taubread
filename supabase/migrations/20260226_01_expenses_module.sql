-- =============================================
-- Expenses & P&L Module
-- Tables: expense_categories, suppliers, expense_uploads, expense_entries, revenue_entries
-- =============================================

-- 1. Expense Categories (קטגוריות הוצאות)
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_type text NOT NULL DEFAULT 'operating'
    CHECK (parent_type IN ('cost_of_goods', 'operating', 'finance', 'other')),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE INDEX idx_expense_categories_company ON public.expense_categories(company_id);
COMMENT ON TABLE public.expense_categories IS 'קטגוריות הוצאות - חומרי גלם, שכירות, שכר וכו';

-- 2. Suppliers (ספקים)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_key text NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  merged_into_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, account_key)
);

CREATE INDEX idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX idx_suppliers_category ON public.suppliers(category_id);
CREATE INDEX idx_suppliers_merged ON public.suppliers(merged_into_id);
COMMENT ON TABLE public.suppliers IS 'ספקים מזוהים מדוחות חשבשבת';

-- 3. Expense Uploads (העלאות דוחות הוצאות)
CREATE TABLE IF NOT EXISTS public.expense_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  file_name text NOT NULL,
  period_month integer,
  period_year integer,
  rows_count integer DEFAULT 0,
  suppliers_found integer DEFAULT 0,
  total_debits numeric(14,2) DEFAULT 0,
  total_credits numeric(14,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expense_uploads_company ON public.expense_uploads(company_id);
COMMENT ON TABLE public.expense_uploads IS 'היסטוריית העלאות דוחות הוצאות';

-- 4. Expense Entries (רשומות הוצאות)
CREATE TABLE IF NOT EXISTS public.expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL REFERENCES public.expense_uploads(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  account_key text NOT NULL,
  reference_date date,
  details text,
  credits numeric(14,2) NOT NULL DEFAULT 0,
  debits numeric(14,2) NOT NULL DEFAULT 0,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  month integer NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expense_entries_company ON public.expense_entries(company_id);
CREATE INDEX idx_expense_entries_upload ON public.expense_entries(upload_id);
CREATE INDEX idx_expense_entries_supplier ON public.expense_entries(supplier_id);
CREATE INDEX idx_expense_entries_period ON public.expense_entries(company_id, year, month);
COMMENT ON TABLE public.expense_entries IS 'רשומות הוצאות בודדות מדוחות חשבשבת';

-- 5. Revenue Entries (הכנסות - הזנה ידנית)
CREATE TABLE IF NOT EXISTS public.revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year BETWEEN 2020 AND 2099),
  category text NOT NULL DEFAULT 'sales',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, year, month, category)
);

CREATE INDEX idx_revenue_entries_company ON public.revenue_entries(company_id);
CREATE INDEX idx_revenue_entries_period ON public.revenue_entries(company_id, year, month);
COMMENT ON TABLE public.revenue_entries IS 'הכנסות - הזנה ידנית או מ-PDF';

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_categories_multi" ON public.expense_categories FOR ALL
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_multi" ON public.suppliers FOR ALL
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

ALTER TABLE public.expense_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_uploads_multi" ON public.expense_uploads FOR ALL
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_entries_multi" ON public.expense_entries FOR ALL
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revenue_entries_multi" ON public.revenue_entries FOR ALL
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

-- =============================================
-- Seed default categories (for new companies)
-- =============================================
CREATE OR REPLACE FUNCTION public.seed_default_expense_categories(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO expense_categories (company_id, name, parent_type, sort_order) VALUES
    (p_company_id, 'חומרי גלם',         'cost_of_goods', 1),
    (p_company_id, 'הובלה ולוגיסטיקה',   'cost_of_goods', 2),
    (p_company_id, 'שכר עבודה',          'operating',     3),
    (p_company_id, 'שכירות ותחזוקה',     'operating',     4),
    (p_company_id, 'ביטוחים',            'operating',     5),
    (p_company_id, 'שיווק ופרסום',       'operating',     6),
    (p_company_id, 'חשמל ומים',          'operating',     7),
    (p_company_id, 'תקשורת וטלפון',      'operating',     8),
    (p_company_id, 'ייעוץ ושירותים',     'operating',     9),
    (p_company_id, 'הוצאות מימון',       'finance',      10),
    (p_company_id, 'אחר',               'other',        99)
  ON CONFLICT (company_id, name) DO NOTHING;
END;
$$;
