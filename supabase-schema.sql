-- =============================================
-- BAKERY ANALYTICS - DATABASE SCHEMA
-- =============================================
-- Multi-tenant system for multiple companies
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. COMPANIES TABLE
-- =============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- for URLs: "mafia-shemesh"
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Add comment
COMMENT ON TABLE companies IS 'רשימת החברות במערכת';

-- =============================================
-- 2. USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'משתמשי המערכת - כל משתמש שייך לחברה אחת';

-- =============================================
-- 3. DATA METADATA TABLE
-- =============================================
CREATE TABLE data_metadata (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  current_year INTEGER NOT NULL,
  previous_year INTEGER NOT NULL,
  period_start TEXT NOT NULL, -- "202401"
  period_end TEXT NOT NULL,   -- "202601"
  months_list TEXT[] DEFAULT '{}', -- ["202401", "202402", ...]
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE data_metadata IS 'מידע על התקופות הנוכחיות לכל חברה';

-- =============================================
-- 4. STORES TABLE (Aggregated)
-- =============================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  external_id INTEGER NOT NULL, -- מזהה לקוח מה-Excel
  name TEXT NOT NULL,
  city TEXT,
  network TEXT,
  driver TEXT,
  agent TEXT,
  
  -- Monthly data as JSONB: {"202401": 205, "202402": 171, ...}
  monthly_qty JSONB DEFAULT '{}',
  monthly_sales JSONB DEFAULT '{}',
  monthly_gross JSONB DEFAULT '{}',
  monthly_returns JSONB DEFAULT '{}',
  
  -- Calculated metrics
  metrics JSONB DEFAULT '{}',
  -- Example: {
  --   "qty_current_year": 1546,
  --   "qty_previous_year": 2083,
  --   "sales_current_year": 16620.65,
  --   "sales_previous_year": 23996.9,
  --   "metric_12v12": -25.8,
  --   "metric_6v6": 31.4,
  --   "metric_3v3": -12.4,
  --   "metric_2v2": -38.8,
  --   "returns_pct_current": 31.73,
  --   "returns_pct_previous": 19.71,
  --   "status_long": "ירידה",
  --   "status_short": "אזעקה"
  -- }
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, external_id)
);

COMMENT ON TABLE stores IS 'חנויות מסוכמות - כל חנות = שורה אחת עם כל החודשים';

-- Index for performance
CREATE INDEX idx_stores_company ON stores(company_id);
CREATE INDEX idx_stores_city ON stores(company_id, city);
CREATE INDEX idx_stores_network ON stores(company_id, network);

-- =============================================
-- 5. PRODUCTS TABLE (Aggregated)
-- =============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  external_id INTEGER NOT NULL, -- מזהה מוצר מה-Excel
  name TEXT NOT NULL,
  category TEXT,
  
  -- Monthly data as JSONB
  monthly_qty JSONB DEFAULT '{}',
  monthly_sales JSONB DEFAULT '{}',
  
  -- Calculated metrics
  metrics JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, external_id)
);

COMMENT ON TABLE products IS 'מוצרים מסוכמים - כל מוצר = שורה אחת עם כל החודשים';

CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_category ON products(company_id, category);

-- =============================================
-- 5b. STORE_PRODUCTS TABLE (for Products tab in store detail)
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

-- =============================================
-- 6. SNAPSHOTS TABLE (For Comparison)
-- =============================================
CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- "ינואר 2026"
  period_end TEXT NOT NULL, -- "202601"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Summary totals
  summary JSONB DEFAULT '{}',
  -- Example: {
  --   "total_stores": 558,
  --   "total_products": 84,
  --   "total_sales": 25306464,
  --   "total_qty": 2883304,
  --   "avg_metric_12v12": 5.2
  -- }
  
  -- Stores data array (for comparison)
  stores_data JSONB DEFAULT '[]',
  -- Example: [
  --   {"external_id": 246, "name": "מאפיית...", "sales": 536808, "metric_12v12": 25.5},
  --   ...
  -- ]
  
  -- Products data array
  products_data JSONB DEFAULT '[]'
);

COMMENT ON TABLE snapshots IS 'צילומי מצב להשוואה בין תקופות - עד 4 לכל חברה';

CREATE INDEX idx_snapshots_company ON snapshots(company_id);

-- =============================================
-- 7. UPLOADS HISTORY TABLE
-- =============================================
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Period info
  period_start TEXT, -- "202401"
  period_end TEXT,   -- "202601"
  
  -- Stats
  rows_count INTEGER,
  stores_count INTEGER,
  products_count INTEGER,
  
  -- Status
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER
);

COMMENT ON TABLE uploads IS 'היסטוריית העלאות קבצים';

CREATE INDEX idx_uploads_company ON uploads(company_id);

-- =============================================
-- 8. FILTERS TABLE (Unique values for dropdowns)
-- =============================================
CREATE TABLE filters (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  cities TEXT[] DEFAULT '{}',
  networks TEXT[] DEFAULT '{}',
  drivers TEXT[] DEFAULT '{}',
  agents TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE filters IS 'ערכים ייחודיים לסינון - מתעדכן בכל העלאת קובץ';

-- =============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE filters ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policies for USERS table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Policies for COMPANIES table
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (id = get_user_company_id());

-- Policies for DATA_METADATA table
CREATE POLICY "Users can view own company metadata"
  ON data_metadata FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can update metadata"
  ON data_metadata FOR ALL
  USING (company_id = get_user_company_id());

-- Policies for STORES table
CREATE POLICY "Users can view own company stores"
  ON stores FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage stores"
  ON stores FOR ALL
  USING (company_id = get_user_company_id());

-- Policies for PRODUCTS table
CREATE POLICY "Users can view own company products"
  ON products FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can view own company store_products"
  ON store_products FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage store_products"
  ON store_products FOR ALL
  USING (company_id = get_user_company_id());

-- Policies for SNAPSHOTS table
CREATE POLICY "Users can view own company snapshots"
  ON snapshots FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage snapshots"
  ON snapshots FOR ALL
  USING (company_id = get_user_company_id());

-- Policies for UPLOADS table
CREATE POLICY "Users can view own company uploads"
  ON uploads FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage uploads"
  ON uploads FOR ALL
  USING (company_id = get_user_company_id());

-- Policies for FILTERS table
CREATE POLICY "Users can view own company filters"
  ON filters FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage filters"
  ON filters FOR ALL
  USING (company_id = get_user_company_id());

-- =============================================
-- 10. REALTIME SUBSCRIPTIONS
-- =============================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE stores;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE data_metadata;

-- =============================================
-- 11. HELPER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_store_products_updated_at
  BEFORE UPDATE ON store_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_data_metadata_updated_at
  BEFORE UPDATE ON data_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_filters_updated_at
  BEFORE UPDATE ON filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 12. INSERT TEST COMPANY (for development)
-- =============================================

-- Insert a test company
INSERT INTO companies (id, name, slug, settings) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'חברה לדוגמה', 'demo-company', '{"theme": "blue"}');

-- Insert metadata for test company
INSERT INTO data_metadata (company_id, current_year, previous_year, period_start, period_end, months_list) VALUES
  ('00000000-0000-0000-0000-000000000001', 2025, 2024, '202401', '202512', 
   ARRAY['202401','202402','202403','202404','202405','202406','202407','202408','202409','202410','202411','202412','202501','202502','202503','202504','202505','202506','202507','202508','202509','202510','202511','202512']);

-- Insert empty filters for test company
INSERT INTO filters (company_id) VALUES
  ('00000000-0000-0000-0000-000000000001');

-- =============================================
-- DONE! 
-- =============================================
