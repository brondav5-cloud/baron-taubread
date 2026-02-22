-- ============================================
-- STORE DELIVERIES TABLE
-- תעודות משלוח מצומצמות - סיכום לפי חנות/שבוע/חודש
-- ============================================

-- Main deliveries summary table
CREATE TABLE IF NOT EXISTS store_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Store reference
  store_external_id INTEGER NOT NULL,
  store_name TEXT NOT NULL,
  
  -- Time period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  week INTEGER, -- Week number in year (1-53), NULL for monthly totals
  
  -- Delivery metrics
  deliveries_count INTEGER NOT NULL DEFAULT 0,
  total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one record per store/year/month/week combination
  UNIQUE(company_id, store_external_id, year, month, week)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_store_deliveries_company 
  ON store_deliveries(company_id);

CREATE INDEX IF NOT EXISTS idx_store_deliveries_store 
  ON store_deliveries(company_id, store_external_id);

CREATE INDEX IF NOT EXISTS idx_store_deliveries_period 
  ON store_deliveries(company_id, year, month);

-- Enable RLS
ALTER TABLE store_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own company deliveries"
  ON store_deliveries FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own company deliveries"
  ON store_deliveries FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own company deliveries"
  ON store_deliveries FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own company deliveries"
  ON store_deliveries FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- ============================================
-- DELIVERY UPLOADS TRACKING
-- מעקב אחרי העלאות תעודות משלוח
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  filename TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Period info
  period_start TEXT, -- "202401"
  period_end TEXT,   -- "202601"
  
  -- Stats
  rows_processed INTEGER DEFAULT 0,
  stores_count INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  total_value DECIMAL(14,2) DEFAULT 0,
  
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER
);

-- Index
CREATE INDEX IF NOT EXISTS idx_delivery_uploads_company 
  ON delivery_uploads(company_id);

-- Enable RLS
ALTER TABLE delivery_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own company delivery uploads"
  ON delivery_uploads FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own company delivery uploads"
  ON delivery_uploads FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));
