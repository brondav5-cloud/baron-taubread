-- =============================================
-- Seed: task_categories ONLY
-- Users are added from the settings UI
-- Run this in Supabase SQL Editor
-- =============================================

DO $$
DECLARE
  v_company_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN

-- Insert default task categories (no user references needed)
INSERT INTO task_categories (company_id, name, icon, color, default_assignee_id, is_active, sort_order)
VALUES
  (v_company_id, 'מלאי',           '📦', 'blue',   NULL, true, 1),
  (v_company_id, 'תמחור',          '💰', 'yellow', NULL, true, 2),
  (v_company_id, 'משלוח',          '🚚', 'green',  NULL, true, 3),
  (v_company_id, 'תשלום / גבייה',  '💳', 'purple', NULL, true, 4),
  (v_company_id, 'איכות מוצר',     '⚠️', 'red',    NULL, true, 5),
  (v_company_id, 'מתחרים',         '🏪', 'orange', NULL, true, 6),
  (v_company_id, 'כללי',           '📋', 'gray',   NULL, true, 7);

RAISE NOTICE 'Seeded 7 task categories for company %', v_company_id;

END $$;
