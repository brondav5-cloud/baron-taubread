-- =============================================
-- הוספת brondav5@gmail.com ל-public.users + קישור לשתי החברות
-- User ID: 78065eb3-97d9-4522-9b62-8b58d0dcdbd6
-- הרצה: Supabase Dashboard → SQL Editor
-- =============================================

-- 1. הוספה ל-public.users
INSERT INTO users (id, company_id, email, name, role)
VALUES (
  '78065eb3-97d9-4522-9b62-8b58d0dcdbd6'::uuid,
  (SELECT id FROM companies WHERE slug = 'mafiat-baron'),
  'brondav5@gmail.com',
  'דוד ברון',
  'admin'
)
ON CONFLICT (id) DO UPDATE SET 
  company_id = EXCLUDED.company_id,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- 2. קישור לשתי החברות
INSERT INTO user_companies (user_id, company_id, role)
VALUES 
  ('78065eb3-97d9-4522-9b62-8b58d0dcdbd6'::uuid, (SELECT id FROM companies WHERE slug = 'taubread'), 'admin'),
  ('78065eb3-97d9-4522-9b62-8b58d0dcdbd6'::uuid, (SELECT id FROM companies WHERE slug = 'mafiat-baron'), 'admin')
ON CONFLICT (user_id, company_id) DO UPDATE SET role = EXCLUDED.role;
