-- ============================================================
-- Remove all stored classifications — classifications only at upload time
-- Drops: account_classification_overrides, custom_groups, supplier_classifications
-- ============================================================

-- 1. Drop tables (order: FKs first)
DROP TABLE IF EXISTS public.account_classification_overrides CASCADE;
DROP TABLE IF EXISTS public.supplier_classifications CASCADE;
DROP TABLE IF EXISTS public.custom_groups CASCADE;

-- 2. Drop seed function
DROP FUNCTION IF EXISTS public.seed_default_custom_groups(UUID);
