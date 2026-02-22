-- =============================================
-- Multi-Company: Update RLS to use user_companies
-- Replaces single-company (users.company_id) with multi-company (user_companies)
-- super_admin bypasses company check (sees all)
-- =============================================

-- Helper: true if user can access this company (membership OR super_admin)
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_id = p_company_id)
  OR (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin';
$$;

-- For text company_id columns (visits, treatments, tasks, etc.)
CREATE OR REPLACE FUNCTION public.user_has_company_access_text(p_company_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN user_has_company_access(p_company_id::uuid);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- =============================================
-- Companies: user sees companies they're member of
-- =============================================
DROP POLICY IF EXISTS "companies_tenant" ON public.companies;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
CREATE POLICY "companies_multi" ON public.companies FOR SELECT
  USING (
    id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );

-- =============================================
-- Users table (20260220_04)
-- =============================================
DROP POLICY IF EXISTS "users_company_all" ON public.users;
CREATE POLICY "users_company_multi" ON public.users FOR ALL
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    OR id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    OR id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );

-- =============================================
-- Main tables (uuid company_id) - 20260221_03 style
-- =============================================
-- stores
DROP POLICY IF EXISTS "Users can view own company stores" ON public.stores;
CREATE POLICY "stores_multi" ON public.stores FOR SELECT
  USING (user_has_company_access(company_id));

-- products
DROP POLICY IF EXISTS "Users can view own company products" ON public.products;
CREATE POLICY "products_multi" ON public.products FOR SELECT
  USING (user_has_company_access(company_id));

-- filters
DROP POLICY IF EXISTS "Users can view own company filters" ON public.filters;
DROP POLICY IF EXISTS "Users can manage own company filters" ON public.filters;
CREATE POLICY "filters_multi" ON public.filters FOR ALL
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

-- data_metadata
DROP POLICY IF EXISTS "Users can view own company metadata" ON public.data_metadata;
CREATE POLICY "data_metadata_multi" ON public.data_metadata FOR SELECT
  USING (user_has_company_access(company_id));

-- visits (text company_id)
DROP POLICY IF EXISTS "Users can manage own company visits" ON public.visits;
CREATE POLICY "visits_multi" ON public.visits FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- store_treatments (text company_id)
DROP POLICY IF EXISTS "Users can manage own company treatments" ON public.store_treatments;
CREATE POLICY "store_treatments_multi" ON public.store_treatments FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- store_treatment_history (text company_id)
DROP POLICY IF EXISTS "Users can view own company treatment history" ON public.store_treatment_history;
CREATE POLICY "store_treatment_history_multi" ON public.store_treatment_history FOR SELECT
  USING (user_has_company_access_text(company_id));

-- work_plan_items (text company_id)
DROP POLICY IF EXISTS "Users can manage own company work plan" ON public.work_plan_items;
CREATE POLICY "work_plan_items_multi" ON public.work_plan_items FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- product_costs (text company_id)
DROP POLICY IF EXISTS "Users can manage own company product costs" ON public.product_costs;
CREATE POLICY "product_costs_multi" ON public.product_costs FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- driver_groups (text company_id)
DROP POLICY IF EXISTS "Users can manage own company driver groups" ON public.driver_groups;
CREATE POLICY "driver_groups_multi" ON public.driver_groups FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- individual_drivers (text company_id)
DROP POLICY IF EXISTS "Users can manage own company individual drivers" ON public.individual_drivers;
CREATE POLICY "individual_drivers_multi" ON public.individual_drivers FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- =============================================
-- store_products, uploads (20260222)
-- =============================================
DROP POLICY IF EXISTS "Users can view own company store_products" ON public.store_products;
CREATE POLICY "store_products_multi" ON public.store_products FOR SELECT
  USING (user_has_company_access(company_id));

DROP POLICY IF EXISTS "Users can view own company uploads" ON public.uploads;
CREATE POLICY "uploads_multi" ON public.uploads FOR SELECT
  USING (user_has_company_access(company_id));

-- =============================================
-- store_deliveries, delivery_uploads (20260221_01)
-- =============================================
DROP POLICY IF EXISTS "Users can view own company deliveries" ON public.store_deliveries;
DROP POLICY IF EXISTS "Users can insert own company deliveries" ON public.store_deliveries;
DROP POLICY IF EXISTS "Users can update own company deliveries" ON public.store_deliveries;
DROP POLICY IF EXISTS "Users can delete own company deliveries" ON public.store_deliveries;
CREATE POLICY "store_deliveries_multi" ON public.store_deliveries FOR ALL
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

DROP POLICY IF EXISTS "Users can view own company delivery uploads" ON public.delivery_uploads;
DROP POLICY IF EXISTS "Users can insert own company delivery uploads" ON public.delivery_uploads;
CREATE POLICY "delivery_uploads_multi" ON public.delivery_uploads FOR ALL
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

-- =============================================
-- product_developments, development_stage_templates, product_stages, etc. (20260220_01)
-- =============================================
DO $$
BEGIN
  -- product_developments
  DROP POLICY IF EXISTS "product_developments_tenant" ON public.product_developments;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_developments') THEN
    EXECUTE 'CREATE POLICY "product_developments_multi" ON public.product_developments FOR ALL USING (user_has_company_access(company_id)) WITH CHECK (user_has_company_access(company_id))';
  END IF;

  -- development_stage_templates
  DROP POLICY IF EXISTS "stage_templates_tenant" ON public.development_stage_templates;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'development_stage_templates') THEN
    EXECUTE 'CREATE POLICY "development_stage_templates_multi" ON public.development_stage_templates FOR ALL USING (user_has_company_access(company_id)) WITH CHECK (user_has_company_access(company_id))';
  END IF;

  -- product_stages
  DROP POLICY IF EXISTS "product_stages_tenant" ON public.product_stages;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_stages') THEN
    EXECUTE 'CREATE POLICY "product_stages_multi" ON public.product_stages FOR ALL USING (user_has_company_access(company_id)) WITH CHECK (user_has_company_access(company_id))';
  END IF;

  -- stage_comments
  DROP POLICY IF EXISTS "stage_comments_tenant" ON public.stage_comments;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stage_comments') THEN
    EXECUTE 'CREATE POLICY "stage_comments_multi" ON public.stage_comments FOR ALL USING (user_has_company_access(company_id)) WITH CHECK (user_has_company_access(company_id))';
  END IF;

  -- stage_attachments
  DROP POLICY IF EXISTS "stage_attachments_tenant" ON public.stage_attachments;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stage_attachments') THEN
    EXECUTE 'CREATE POLICY "stage_attachments_multi" ON public.stage_attachments FOR ALL USING (user_has_company_access(company_id)) WITH CHECK (user_has_company_access(company_id))';
  END IF;

  -- product_history
  DROP POLICY IF EXISTS "product_history_tenant" ON public.product_history;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_history') THEN
    EXECUTE 'CREATE POLICY "product_history_multi" ON public.product_history FOR ALL USING (user_has_company_access(company_id)) WITH CHECK (user_has_company_access(company_id))';
  END IF;

  -- development_reminders
  DROP POLICY IF EXISTS "development_reminders_tenant" ON public.development_reminders;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'development_reminders') THEN
    EXECUTE 'CREATE POLICY "development_reminders_multi" ON public.development_reminders FOR ALL USING (user_has_company_access(company_id)) WITH CHECK (user_has_company_access(company_id))';
  END IF;
END $$;

-- =============================================
-- task_categories (uuid company_id), tasks, workflows (text company_id)
-- =============================================
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_categories_tenant" ON public.task_categories;
DROP POLICY IF EXISTS "task_categories_select" ON public.task_categories;
CREATE POLICY "task_categories_multi" ON public.task_categories FOR ALL
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

-- tasks (company_id text)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_tenant" ON public.tasks;
DROP POLICY IF EXISTS "tasks_company" ON public.tasks;
CREATE POLICY "tasks_multi" ON public.tasks FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- workflows (company_id text)
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflows_tenant" ON public.workflows;
DROP POLICY IF EXISTS "workflows_company" ON public.workflows;
CREATE POLICY "workflows_multi" ON public.workflows FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- =============================================
-- fault_types, fault_statuses, faults (text company_id)
-- =============================================
ALTER TABLE public.fault_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fault_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faults ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fault_types_tenant" ON public.fault_types;
CREATE POLICY "fault_types_multi" ON public.fault_types FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

DROP POLICY IF EXISTS "fault_statuses_tenant" ON public.fault_statuses;
CREATE POLICY "fault_statuses_multi" ON public.fault_statuses FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

DROP POLICY IF EXISTS "faults_tenant" ON public.faults;
CREATE POLICY "faults_multi" ON public.faults FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));

-- =============================================
-- store_pricing (text company_id)
-- =============================================
ALTER TABLE public.store_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_pricing_tenant" ON public.store_pricing;
CREATE POLICY "store_pricing_multi" ON public.store_pricing FOR ALL
  USING (user_has_company_access_text(company_id))
  WITH CHECK (user_has_company_access_text(company_id));
