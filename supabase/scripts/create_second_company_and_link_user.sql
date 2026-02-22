-- =============================================
-- יצירת חברה שנייה + קישור משתמש קיים לשתי החברות
-- הרצה: Supabase Dashboard → SQL Editor → הדבק והרץ
-- =============================================

-- =============================================
-- חלק א: יצירת החברה החדשה
-- החלף שם ו-slug לפי הצורך
-- =============================================

INSERT INTO companies (id, name, slug, settings, is_active)
VALUES (
  gen_random_uuid(),
  'שם החברה החדשה',        -- החלף לשם הרצוי
  'company-slug',           -- החלף ל-slug ייחודי (אנגלית, למשל: bakery-xyz)
  '{}',
  true
);

-- נתוני תקופות (חובה)
INSERT INTO data_metadata (
  company_id, current_year, previous_year, period_start, period_end, months_list
)
SELECT id, 2025, 2024, '202401', '202512',
  ARRAY['202401','202402','202403','202404','202405','202406','202407','202408','202409','202410','202411','202412','202501','202502','202503','202504','202505','202506','202507','202508','202509','202510','202511','202512']::text[]
FROM companies WHERE slug = 'company-slug'   -- החלף ל-slug שבחרת למעלה
ON CONFLICT (company_id) DO NOTHING;

-- טבלת סינון (חובה)
INSERT INTO filters (company_id) 
SELECT id FROM companies WHERE slug = 'company-slug'
ON CONFLICT (company_id) DO NOTHING;

-- קטגוריות משימות
INSERT INTO task_categories (company_id, name, icon, color, default_assignee_id, is_active, sort_order)
SELECT id, 'מלאי', '📦', 'blue', NULL::uuid, true, 1 FROM companies WHERE slug = 'company-slug'
UNION ALL SELECT id, 'תמחור', '💰', 'yellow', NULL::uuid, true, 2 FROM companies WHERE slug = 'company-slug'
UNION ALL SELECT id, 'משלוח', '🚚', 'green', NULL::uuid, true, 3 FROM companies WHERE slug = 'company-slug'
UNION ALL SELECT id, 'תשלום / גבייה', '💳', 'purple', NULL::uuid, true, 4 FROM companies WHERE slug = 'company-slug'
UNION ALL SELECT id, 'איכות מוצר', '⚠️', 'red', NULL::uuid, true, 5 FROM companies WHERE slug = 'company-slug'
UNION ALL SELECT id, 'מתחרים', '🏪', 'orange', NULL::uuid, true, 6 FROM companies WHERE slug = 'company-slug'
UNION ALL SELECT id, 'כללי', '📋', 'gray', NULL::uuid, true, 7 FROM companies WHERE slug = 'company-slug';

-- =============================================
-- חלק ב: קישור משתמש קיים לחברה השנייה
-- =============================================
-- 1. מצא את ה-user_id: Supabase → Authentication → Users (או שאילתה: SELECT id, email FROM users;)
-- 2. מצא את ה-company_id של החברה החדשה: SELECT id, slug FROM companies WHERE slug = 'company-slug';
-- 3. הריץ את ההוספה (החלף את ה-UUIDs):

INSERT INTO user_companies (user_id, company_id, role)
VALUES (
  'USER-UUID-HERE'::uuid,           -- UUID של המשתמש (מטבלת users / auth.users)
  (SELECT id FROM companies WHERE slug = 'company-slug'),  -- החלף ל-slug של החברה החדשה
  'admin'                           -- תפקיד: admin / editor / viewer
)
ON CONFLICT (user_id, company_id) DO UPDATE SET role = EXCLUDED.role;
