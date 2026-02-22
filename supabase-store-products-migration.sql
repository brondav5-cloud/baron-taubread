-- =============================================
-- STORE_PRODUCTS TABLE - for Store Detail Products tab
-- Run this in Supabase SQL Editor AFTER the main schema
-- =============================================

CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  store_external_id INTEGER NOT NULL,
  product_external_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_category TEXT,
  monthly_qty JSONB DEFAULT '{}',
  monthly_sales JSONB DEFAULT '{}',
  total_qty NUMERIC DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, store_external_id, product_external_id)
);

COMMENT ON TABLE store_products IS 'מוצרים לפי חנות - צומת store×product מהאקסל';

CREATE INDEX idx_store_products_company_store ON store_products(company_id, store_external_id);
CREATE INDEX idx_store_products_company ON store_products(company_id);

-- RLS
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company store_products"
  ON store_products FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage store_products"
  ON store_products FOR ALL
  USING (company_id = get_user_company_id());

-- Allow service role (no auth) - if using anon key without RLS bypass, add policy for anon
-- For now the API uses service_role which bypasses RLS

-- Trigger for updated_at (requires update_updated_at from main schema)
CREATE TRIGGER update_store_products_updated_at
  BEFORE UPDATE ON store_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- IMPORTANT: Run this migration in Supabase SQL Editor
-- after the main supabase-schema.sql has been applied.
-- =============================================
