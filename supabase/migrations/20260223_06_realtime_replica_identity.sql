-- Supabase Realtime requires REPLICA IDENTITY FULL to filter
-- by non-primary-key columns (like company_id) on INSERT events.
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.faults REPLICA IDENTITY FULL;
ALTER TABLE public.visits REPLICA IDENTITY FULL;
ALTER TABLE public.workflows REPLICA IDENTITY FULL;
ALTER TABLE public.store_treatments REPLICA IDENTITY FULL;
