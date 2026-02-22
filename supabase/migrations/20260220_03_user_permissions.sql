-- =============================================
-- User Permissions - הרשאות גישה לפי חלונות
-- =============================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

COMMENT ON COLUMN users.permissions IS 'גישה לכל מודול: { "tasks": true, "faults": true, "product_development": true, "settings": true, ... }';
