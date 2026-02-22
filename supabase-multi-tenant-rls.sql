-- =============================================
-- MULTI-TENANT RLS MIGRATION
-- Run AFTER switching to Supabase Auth
-- Prerequisite: All users exist in auth.users and public.users
-- =============================================

-- 1. Add super_admin to role enum
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer'));

-- 2. Ensure get_user_company_id exists (already in main schema)
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 3. Drop existing policies and recreate with WITH CHECK for INSERT safety
--    (ensures user cannot INSERT row with another company's company_id)

-- COMPANIES - users only see their own company
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "companies_tenant" ON companies
  FOR SELECT USING (id = get_user_company_id());

-- DATA_METADATA
DROP POLICY IF EXISTS "Users can view own company metadata" ON data_metadata;
DROP POLICY IF EXISTS "Admins can update metadata" ON data_metadata;
CREATE POLICY "data_metadata_tenant" ON data_metadata
  FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- STORES
DROP POLICY IF EXISTS "Users can view own company stores" ON stores;
DROP POLICY IF EXISTS "Admins can manage stores" ON stores;
CREATE POLICY "stores_tenant" ON stores
  FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- PRODUCTS
DROP POLICY IF EXISTS "Users can view own company products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "products_tenant" ON products
  FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- STORE_PRODUCTS
DROP POLICY IF EXISTS "Users can view own company store_products" ON store_products;
DROP POLICY IF EXISTS "Admins can manage store_products" ON store_products;
CREATE POLICY "store_products_tenant" ON store_products
  FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- SNAPSHOTS
DROP POLICY IF EXISTS "Users can view own company snapshots" ON snapshots;
DROP POLICY IF EXISTS "Admins can manage snapshots" ON snapshots;
CREATE POLICY "snapshots_tenant" ON snapshots
  FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- UPLOADS
DROP POLICY IF EXISTS "Users can view own company uploads" ON uploads;
DROP POLICY IF EXISTS "Admins can manage uploads" ON uploads;
CREATE POLICY "uploads_tenant" ON uploads
  FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- FILTERS
DROP POLICY IF EXISTS "Users can view own company filters" ON filters;
DROP POLICY IF EXISTS "Admins can manage filters" ON filters;
CREATE POLICY "filters_tenant" ON filters
  FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- =============================================
-- DONE
-- =============================================
-- RLS now enforces strict tenant isolation.
-- auth.uid() must be set (Supabase Auth session).
-- get_user_company_id() returns user's company from public.users.
