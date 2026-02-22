-- =============================================
-- קישור משתמש לשתי החברות
-- User ID: 78065eb3-97d9-4522-9b62-8b58d0dcdbd6
-- הרצה: Supabase Dashboard → SQL Editor
-- =============================================

INSERT INTO user_companies (user_id, company_id, role)
VALUES 
  ('78065eb3-97d9-4522-9b62-8b58d0dcdbd6'::uuid, (SELECT id FROM companies WHERE slug = 'taubread'), 'admin'),
  ('78065eb3-97d9-4522-9b62-8b58d0dcdbd6'::uuid, (SELECT id FROM companies WHERE slug = 'mafiat-baron'), 'admin')
ON CONFLICT (user_id, company_id) DO UPDATE SET role = EXCLUDED.role;
