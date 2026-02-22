-- =============================================
-- יצירת חברה: מאפיית ברון
-- הרצה: Supabase Dashboard → SQL Editor → הדבק והרץ
-- =============================================

-- שלב א: יצירת החברה
INSERT INTO companies (id, name, slug, settings, is_active)
VALUES (
  gen_random_uuid(),
  'מאפיית ברון',
  'mafiat-baron',
  '{}',
  true
);

-- שלב ב: נתוני תקופות (חובה)
INSERT INTO data_metadata (
  company_id, current_year, previous_year, period_start, period_end, months_list
)
SELECT id, 2025, 2024, '202401', '202512',
  ARRAY['202401','202402','202403','202404','202405','202406','202407','202408','202409','202410','202411','202412','202501','202502','202503','202504','202505','202506','202507','202508','202509','202510','202511','202512']::text[]
FROM companies WHERE slug = 'mafiat-baron'
ON CONFLICT (company_id) DO NOTHING;

-- שלב ג: טבלת סינון (חובה)
INSERT INTO filters (company_id) SELECT id FROM companies WHERE slug = 'mafiat-baron'
ON CONFLICT (company_id) DO NOTHING;

-- שלב ד: קטגוריות משימות (אופציונלי – לשימוש במשימות)
INSERT INTO task_categories (company_id, name, icon, color, default_assignee_id, is_active, sort_order)
SELECT id, 'מלאי', '📦', 'blue', NULL::uuid, true, 1 FROM companies WHERE slug = 'mafiat-baron'
UNION ALL SELECT id, 'תמחור', '💰', 'yellow', NULL::uuid, true, 2 FROM companies WHERE slug = 'mafiat-baron'
UNION ALL SELECT id, 'משלוח', '🚚', 'green', NULL::uuid, true, 3 FROM companies WHERE slug = 'mafiat-baron'
UNION ALL SELECT id, 'תשלום / גבייה', '💳', 'purple', NULL::uuid, true, 4 FROM companies WHERE slug = 'mafiat-baron'
UNION ALL SELECT id, 'איכות מוצר', '⚠️', 'red', NULL::uuid, true, 5 FROM companies WHERE slug = 'mafiat-baron'
UNION ALL SELECT id, 'מתחרים', '🏪', 'orange', NULL::uuid, true, 6 FROM companies WHERE slug = 'mafiat-baron'
UNION ALL SELECT id, 'כללי', '📋', 'gray', NULL::uuid, true, 7 FROM companies WHERE slug = 'mafiat-baron';

-- =============================================
-- שלב ה: הוספת משתמש מנהל (להריץ אחרי יצירת המשתמש ב-Auth)
-- =============================================
-- 1. Supabase Dashboard → Authentication → Users → Add user
-- 2. הזן: brondav5@gmail.com + סיסמה → Create
-- 3. העתק את ה-UUID של המשתמש (עמודה id)
-- 4. הורד את /* מתחתית הבלוק ו-*/ מסוף הבלוק, והחלף את ה-UUID
-- =============================================

/*
-- 4a. Insert user + membership (user_companies for multi-company)
INSERT INTO users (id, company_id, email, name, role)
VALUES (
  'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'::uuid,
  (SELECT id FROM companies WHERE slug = 'mafiat-baron'),
  'brondav5@gmail.com',
  'דוד ברון',
  'admin'
);
INSERT INTO user_companies (user_id, company_id, role)
VALUES (
  'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'::uuid,
  (SELECT id FROM companies WHERE slug = 'mafiat-baron'),
  'admin'
);
*/
