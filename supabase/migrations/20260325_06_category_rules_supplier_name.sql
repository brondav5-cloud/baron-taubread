-- Add supplier_name as a valid match_field in category_rules
-- Previously only: description, details, reference, operation_code

ALTER TABLE public.category_rules
  DROP CONSTRAINT IF EXISTS category_rules_match_field_check;

ALTER TABLE public.category_rules
  ADD CONSTRAINT category_rules_match_field_check
  CHECK (match_field IN ('description', 'details', 'reference', 'operation_code', 'supplier_name'));
