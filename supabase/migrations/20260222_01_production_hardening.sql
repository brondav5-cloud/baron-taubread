-- =============================================
-- Production Hardening Phase 1
-- 1. RLS on store_products and uploads
-- 2. Remove redundant Service role full access policies
-- 3. Prevent role escalation on users table
-- =============================================

-- 1. Ensure get_my_company_id exists (from 20260220_04)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $fn$ SELECT company_id::uuid FROM public.users WHERE id = auth.uid() LIMIT 1; $fn$;

-- 2. store_products: Enable RLS, add SELECT policy
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company store_products" ON public.store_products;
CREATE POLICY "Users can view own company store_products" ON public.store_products FOR SELECT
  USING (company_id = get_my_company_id());

-- 3. uploads: Enable RLS, add SELECT policy
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company uploads" ON public.uploads;
DROP POLICY IF EXISTS "Admins can manage uploads" ON public.uploads;
CREATE POLICY "Users can view own company uploads" ON public.uploads FOR SELECT
  USING (company_id = get_my_company_id());

-- 4. Remove redundant Service role full access policies (service_role bypasses RLS)
DROP POLICY IF EXISTS "Service role full access stores" ON public.stores;
DROP POLICY IF EXISTS "Service role full access products" ON public.products;
DROP POLICY IF EXISTS "Service role full access metadata" ON public.data_metadata;

-- 5. Prevent privilege escalation: only admin/super_admin can change role, permissions, company_id
CREATE OR REPLACE FUNCTION public.prevent_users_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_role text;
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  SELECT role INTO my_role FROM public.users WHERE id = auth.uid() LIMIT 1;
  IF my_role IS NULL OR my_role NOT IN ('admin', 'super_admin') THEN
    NEW.role := OLD.role;
    NEW.permissions := OLD.permissions;
    NEW.company_id := OLD.company_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_users_privilege_escalation ON public.users;
CREATE TRIGGER trg_prevent_users_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_users_privilege_escalation();
