-- =============================================
-- 1. remind_at - שדה לתזכורות עתידיות (משימות + פיתוח מוצרים)
-- =============================================

-- משימות רגילות
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remind_at timestamptz;
COMMENT ON COLUMN tasks.remind_at IS 'תאריך ושעה לתזכורת (לשליחה בווטסאפ/אימייל בעתיד)';

-- משימות מורכבות (workflows) - תזכורת לכל workflow
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS remind_at timestamptz;
COMMENT ON COLUMN workflows.remind_at IS 'תאריך ושעה לתזכורת';

-- שלבי פיתוח מוצר
ALTER TABLE product_stages ADD COLUMN IF NOT EXISTS remind_at timestamptz;
COMMENT ON COLUMN product_stages.remind_at IS 'תאריך ושעה לתזכורת על השלב';

-- =============================================
-- 2. RLS Policies לטבלת users - פתרון ל-403 Forbidden
-- =============================================
-- ההכנסה/עדכון ל-users נחסמה כי RLS פעיל בלי policy מתאים.
-- פתרון: שימוש ב-API route /api/users עם service role (מעקף RLS).
-- אם יש Supabase Auth, ניתן להפעיל גם את ה-policies הבאים.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    RETURN;
  END IF;

  -- פונקציה שמחזירה את company_id של המשתמש המחובר (מעקף RLS)
  CREATE OR REPLACE FUNCTION public.get_my_company_id()
  RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
  AS $fn$ SELECT company_id::uuid FROM public.users WHERE id = auth.uid() LIMIT 1; $fn$;

  ALTER TABLE users ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "users_select_same_company" ON users;
  DROP POLICY IF EXISTS "users_insert_same_company" ON users;
  DROP POLICY IF EXISTS "users_update_same_company" ON users;
  DROP POLICY IF EXISTS "users_company_all" ON users;

  CREATE POLICY "users_company_all" ON users
  FOR ALL
  USING (company_id::text = (SELECT get_my_company_id()::text))
  WITH CHECK (company_id::text = (SELECT get_my_company_id()::text));

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'users RLS: %', SQLERRM;
END $$;
