-- ============================================
-- ADD QUANTITY COLUMN TO STORE DELIVERIES
-- ============================================

ALTER TABLE store_deliveries
ADD COLUMN IF NOT EXISTS total_quantity DECIMAL(12,2) NOT NULL DEFAULT 0;
