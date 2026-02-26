-- ============================================================
-- Migration 003 — Alert Rules Upgrade
-- Adds new rule types, severity, name, preset support
-- Run in Supabase SQL Editor
-- ============================================================

-- Drop old constraint
ALTER TABLE public.alert_rules
  DROP CONSTRAINT IF EXISTS alert_rules_rule_type_check;

-- Add new constraint with extended rule types
ALTER TABLE public.alert_rules
  ADD CONSTRAINT alert_rules_rule_type_check CHECK (rule_type IN (
    'monthly_change_pct',
    'yearly_change_pct',
    'absolute_threshold',
    'consecutive_increase',
    'margin_below',
    'new_account'
  ));

-- Add new columns (IF NOT EXISTS to be safe on re-runs)
ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS name          TEXT,
  ADD COLUMN IF NOT EXISTS severity      TEXT DEFAULT 'warning'
    CHECK (severity IN ('warning', 'critical')),
  ADD COLUMN IF NOT EXISTS applies_to    TEXT DEFAULT 'all'
    CHECK (applies_to IN ('all', 'specific')),
  ADD COLUMN IF NOT EXISTS is_preset     BOOLEAN DEFAULT false;
