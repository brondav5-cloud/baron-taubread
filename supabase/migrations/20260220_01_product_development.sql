-- =============================================
-- Product Development Management System
-- פיתוח מוצרים - ניהול תהליך פיתוח ממושג ועד השקה
-- =============================================
-- Prerequisite: companies table must exist
-- Run in Supabase SQL Editor
-- =============================================

-- Table 1: product_developments - Main products table
CREATE TABLE IF NOT EXISTS product_developments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Product info
  name text NOT NULL,
  description text,
  category text,

  -- Status: waiting | active | completed | cancelled
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
  priority integer NOT NULL DEFAULT 0,

  -- Dates
  target_launch_date date,
  actual_launch_date date,
  started_at timestamptz,
  completed_at timestamptz,

  -- Current stage
  current_stage_id uuid,
  current_stage_number integer NOT NULL DEFAULT 1,

  -- Owner
  owner_id text,
  owner_name text,

  -- Meta
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX idx_product_developments_company ON product_developments(company_id);
CREATE INDEX idx_product_developments_status ON product_developments(company_id, status);
CREATE INDEX idx_product_developments_priority ON product_developments(company_id, priority DESC);

-- Table 2: development_stage_templates - Default stage templates
CREATE TABLE IF NOT EXISTS development_stage_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  stage_number integer NOT NULL,
  name text NOT NULL,
  description text,

  default_duration_days integer NOT NULL DEFAULT 7,
  default_owner_role text,

  is_repeatable boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(company_id, stage_number)
);

CREATE INDEX idx_stage_templates_company ON development_stage_templates(company_id);

-- Table 3: product_stages - Stage instances for each product
CREATE TABLE IF NOT EXISTS product_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product_developments(id) ON DELETE CASCADE,
  template_id uuid REFERENCES development_stage_templates(id),

  stage_number integer NOT NULL,
  iteration integer NOT NULL DEFAULT 1,
  name text NOT NULL,

  -- Status: pending | in_progress | review | approved | rejected | skipped
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'approved', 'rejected', 'skipped')),

  -- Dates
  target_date date,
  started_at timestamptz,
  completed_at timestamptz,

  -- Owner
  owner_id text,
  owner_name text,

  -- Approval
  approved_by text,
  approved_at timestamptz,
  rejection_reason text,

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_stages_product ON product_stages(product_id);
CREATE INDEX idx_product_stages_company ON product_stages(company_id);
CREATE INDEX idx_product_stages_status ON product_stages(product_id, status);

-- Add FK for current_stage_id (after product_stages exists)
ALTER TABLE product_developments
  ADD CONSTRAINT fk_product_developments_current_stage
  FOREIGN KEY (current_stage_id) REFERENCES product_stages(id) ON DELETE SET NULL;

-- Table 4: stage_comments - Comments and notes
CREATE TABLE IF NOT EXISTS stage_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES product_stages(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product_developments(id) ON DELETE CASCADE,

  content text NOT NULL,
  author_id text,
  author_name text,

  -- Type: comment | change_request | approval | rejection | system
  type text NOT NULL DEFAULT 'comment' CHECK (type IN ('comment', 'change_request', 'approval', 'rejection', 'system')),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_comments_stage ON stage_comments(stage_id);
CREATE INDEX idx_stage_comments_product ON stage_comments(product_id);

-- Table 5: stage_attachments - File attachments
CREATE TABLE IF NOT EXISTS stage_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES product_stages(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product_developments(id) ON DELETE CASCADE,

  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  description text,

  uploaded_by text,
  uploaded_by_name text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_attachments_stage ON stage_attachments(stage_id);
CREATE INDEX idx_stage_attachments_product ON stage_attachments(product_id);

-- Table 6: product_history - Change history / audit log
CREATE TABLE IF NOT EXISTS product_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product_developments(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES product_stages(id),

  action text NOT NULL,
  description text,
  old_value text,
  new_value text,

  performed_by text,
  performed_by_name text,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_history_product ON product_history(product_id);
CREATE INDEX idx_product_history_company ON product_history(company_id);

-- Table 7: development_reminders - Reminders and notifications
CREATE TABLE IF NOT EXISTS development_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product_developments(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES product_stages(id),

  reminder_date date NOT NULL,
  reminder_type text NOT NULL DEFAULT 'deadline' CHECK (reminder_type IN ('deadline', 'review', 'custom')),

  title text NOT NULL,
  message text,

  target_user_id text,
  target_user_name text,

  is_sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  is_dismissed boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_development_reminders_product ON development_reminders(product_id);
CREATE INDEX idx_development_reminders_date ON development_reminders(reminder_date) WHERE is_dismissed = false;

-- =============================================
-- Trigger: Update updated_at on product_developments
-- =============================================
CREATE OR REPLACE FUNCTION update_product_developments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_developments_updated_at ON product_developments;
CREATE TRIGGER trigger_product_developments_updated_at
  BEFORE UPDATE ON product_developments
  FOR EACH ROW EXECUTE FUNCTION update_product_developments_updated_at();

-- =============================================
-- Trigger: Update updated_at on product_stages
-- =============================================
DROP TRIGGER IF EXISTS trigger_product_stages_updated_at ON product_stages;
CREATE TRIGGER trigger_product_stages_updated_at
  BEFORE UPDATE ON product_stages
  FOR EACH ROW EXECUTE FUNCTION update_product_developments_updated_at();

-- =============================================
-- RLS Policies (tenant isolation)
-- =============================================
ALTER TABLE product_developments ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_stage_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_reminders ENABLE ROW LEVEL SECURITY;

-- Use get_user_company_id() if it exists; otherwise allow all (for initial setup)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_company_id') THEN
    -- product_developments
    DROP POLICY IF EXISTS "product_developments_tenant" ON product_developments;
    DROP POLICY IF EXISTS "product_developments_allow_all" ON product_developments;
    CREATE POLICY "product_developments_tenant" ON product_developments
      FOR ALL USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());

    -- development_stage_templates
    DROP POLICY IF EXISTS "stage_templates_tenant" ON development_stage_templates;
    DROP POLICY IF EXISTS "stage_templates_allow_all" ON development_stage_templates;
    CREATE POLICY "stage_templates_tenant" ON development_stage_templates
      FOR ALL USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());

    -- product_stages
    DROP POLICY IF EXISTS "product_stages_tenant" ON product_stages;
    DROP POLICY IF EXISTS "product_stages_allow_all" ON product_stages;
    CREATE POLICY "product_stages_tenant" ON product_stages
      FOR ALL USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());

    -- stage_comments
    DROP POLICY IF EXISTS "stage_comments_tenant" ON stage_comments;
    DROP POLICY IF EXISTS "stage_comments_allow_all" ON stage_comments;
    CREATE POLICY "stage_comments_tenant" ON stage_comments
      FOR ALL USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());

    -- stage_attachments
    DROP POLICY IF EXISTS "stage_attachments_tenant" ON stage_attachments;
    DROP POLICY IF EXISTS "stage_attachments_allow_all" ON stage_attachments;
    CREATE POLICY "stage_attachments_tenant" ON stage_attachments
      FOR ALL USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());

    -- product_history
    DROP POLICY IF EXISTS "product_history_tenant" ON product_history;
    DROP POLICY IF EXISTS "product_history_allow_all" ON product_history;
    CREATE POLICY "product_history_tenant" ON product_history
      FOR ALL USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());

    -- development_reminders
    DROP POLICY IF EXISTS "development_reminders_tenant" ON development_reminders;
    DROP POLICY IF EXISTS "development_reminders_allow_all" ON development_reminders;
    CREATE POLICY "development_reminders_tenant" ON development_reminders
      FOR ALL USING (company_id = get_user_company_id())
      WITH CHECK (company_id = get_user_company_id());
  ELSE
    -- Fallback: allow all (for development without auth)
    DROP POLICY IF EXISTS "product_developments_allow_all" ON product_developments;
    DROP POLICY IF EXISTS "stage_templates_allow_all" ON development_stage_templates;
    DROP POLICY IF EXISTS "product_stages_allow_all" ON product_stages;
    DROP POLICY IF EXISTS "stage_comments_allow_all" ON stage_comments;
    DROP POLICY IF EXISTS "stage_attachments_allow_all" ON stage_attachments;
    DROP POLICY IF EXISTS "product_history_allow_all" ON product_history;
    DROP POLICY IF EXISTS "development_reminders_allow_all" ON development_reminders;
    CREATE POLICY "product_developments_allow_all" ON product_developments FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "stage_templates_allow_all" ON development_stage_templates FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "product_stages_allow_all" ON product_stages FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "stage_comments_allow_all" ON stage_comments FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "stage_attachments_allow_all" ON stage_attachments FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "product_history_allow_all" ON product_history FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "development_reminders_allow_all" ON development_reminders FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
