-- =============================================
-- יצירת חברה: טאוברד (Taubread Bakery)
-- הרצה: Supabase Dashboard → SQL Editor → הדבק והרץ
-- =============================================

-- שלב א: יצירת החברה
INSERT INTO companies (id, name, slug, settings, is_active)
VALUES (
  gen_random_uuid(),
  'טאוברד',
  'taubread',
  '{}',
  true
);

-- שלב ב: נתוני תקופות (חובה)
INSERT INTO data_metadata (
  company_id, current_year, previous_year, period_start, period_end, months_list
)
SELECT id, 2025, 2024, '202401', '202512',
  ARRAY['202401','202402','202403','202404','202405','202406','202407','202408','202409','202410','202411','202412','202501','202502','202503','202504','202505','202506','202507','202508','202509','202510','202511','202512']::text[]
FROM companies WHERE slug = 'taubread'
ON CONFLICT (company_id) DO NOTHING;

-- שלב ג: טבלת סינון (חובה)
INSERT INTO filters (company_id) SELECT id FROM companies WHERE slug = 'taubread'
ON CONFLICT (company_id) DO NOTHING;

-- שלב ד: קטגוריות משימות (אופציונלי – לשימוש במשימות)
INSERT INTO task_categories (company_id, name, icon, color, default_assignee_id, is_active, sort_order)
SELECT id, 'מלאי', '📦', 'blue', NULL::uuid, true, 1 FROM companies WHERE slug = 'taubread'
UNION ALL SELECT id, 'תמחור', '💰', 'yellow', NULL::uuid, true, 2 FROM companies WHERE slug = 'taubread'
UNION ALL SELECT id, 'משלוח', '🚚', 'green', NULL::uuid, true, 3 FROM companies WHERE slug = 'taubread'
UNION ALL SELECT id, 'תשלום / גבייה', '💳', 'purple', NULL::uuid, true, 4 FROM companies WHERE slug = 'taubread'
UNION ALL SELECT id, 'איכות מוצר', '⚠️', 'red', NULL::uuid, true, 5 FROM companies WHERE slug = 'taubread'
UNION ALL SELECT id, 'מתחרים', '🏪', 'orange', NULL::uuid, true, 6 FROM companies WHERE slug = 'taubread'
UNION ALL SELECT id, 'כללי', '📋', 'gray', NULL::uuid, true, 7 FROM companies WHERE slug = 'taubread';

-- שלב ה: קישור המשתמש הקיים לחברה החדשה (user_companies)
-- דוד ברון (brondav5@gmail.com) – מנהל גם במאפיית ברון וגם בטאוברד
INSERT INTO user_companies (user_id, company_id, role)
VALUES (
  '18d4bd3b-ed5b-46ab-86ce-0cd86fc4ab6b'::uuid,
  (SELECT id FROM companies WHERE slug = 'taubread'),
  'admin'
)
ON CONFLICT (user_id, company_id) DO UPDATE SET role = 'admin';
