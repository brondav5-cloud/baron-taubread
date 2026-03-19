-- Add 'line' (קו) as a valid entity_type in excluded_entities.
-- Requires dropping and recreating the CHECK constraint.

ALTER TABLE public.excluded_entities
  DROP CONSTRAINT IF EXISTS excluded_entities_entity_type_check;

ALTER TABLE public.excluded_entities
  ADD CONSTRAINT excluded_entities_entity_type_check
  CHECK (entity_type IN ('network', 'driver', 'store', 'agent', 'line'));
