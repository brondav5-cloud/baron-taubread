-- =============================================
-- קישור משתמש לחברה (משתמש שכבר קיים)
-- להרצה: Supabase Dashboard → SQL Editor
-- =============================================
-- משתמש זה יהיה משויך לשתי החברות (או יותר)
-- =============================================

-- דוגמה: קישור brondav5@gmail.com גם למאפיית ברון וגם לחברה השנייה
-- החלף את ה-UUIDs בערכים האמיתיים:

-- א. מצא user_id ו-company_id:
-- SELECT id, email FROM users;
-- SELECT id, name, slug FROM companies;

-- ב. הוסף membership לחברה השנייה:
INSERT INTO user_companies (user_id, company_id, role)
VALUES (
  (SELECT id FROM users WHERE email = 'brondav5@gmail.com'),   -- או: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid
  (SELECT id FROM companies WHERE slug = 'company-slug'),      -- החלף ל-slug של החברה (למשל: mafiat-baron)
  'admin'
)
ON CONFLICT (user_id, company_id) DO UPDATE SET role = EXCLUDED.role;
