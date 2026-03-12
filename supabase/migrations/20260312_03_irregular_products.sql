-- ============================================================
-- IRREGULAR PRODUCTS
-- מוצרים שמגיעים לסירוגין (פעם בשבועיים וכד')
-- ממשיכים להופיע בטבלה אך לא נכנסים לחישוב מגמת החנות הכוללת
-- ============================================================

CREATE TABLE IF NOT EXISTS public.irregular_products (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID    NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_name_normalized TEXT    NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, product_name_normalized)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.irregular_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_irregular_products" ON public.irregular_products
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_irregular_products_company
  ON public.irregular_products (company_id);
