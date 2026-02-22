-- =============================================
-- Extend users table + Create task_categories
-- =============================================

-- 1) Add missing profile columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS avatar text,
  ADD COLUMN IF NOT EXISTS position text,    -- agent, warehouse_manager, etc.
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2) Task categories (replaces localStorage demo categories)
CREATE TABLE IF NOT EXISTS task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📋',
  color text NOT NULL DEFAULT 'gray',
  default_assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_categories_company
  ON task_categories(company_id);
