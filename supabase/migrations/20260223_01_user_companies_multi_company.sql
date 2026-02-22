-- =============================================
-- Multi-Company Access: user_companies + backfill
-- Enables users to belong to 1..N companies with per-company role
-- =============================================

-- 1. Create user_companies junction table
CREATE TABLE IF NOT EXISTS public.user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX idx_user_companies_user ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company ON public.user_companies(company_id);

COMMENT ON TABLE public.user_companies IS 'חברות שהמשתמש חבר בהן - תמיכה במשתמשים מרובי-חברות';

-- 2. Backfill from users table (every existing user gets one membership)
INSERT INTO public.user_companies (user_id, company_id, role)
SELECT id, company_id, COALESCE(role, 'viewer')
FROM public.users
WHERE company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 3. Helper: returns companies the user can access (for RLS)
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM user_companies WHERE user_id = auth.uid();
$$;

-- 4. Helper: check if user can access a company (for API validation)
CREATE OR REPLACE FUNCTION public.user_can_access_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = auth.uid() AND company_id = p_company_id
  );
$$;

-- 5. RLS on user_companies (users can see their own memberships)
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memberships" ON public.user_companies;
CREATE POLICY "Users can view own memberships" ON public.user_companies
  FOR SELECT
  USING (user_id = auth.uid());
