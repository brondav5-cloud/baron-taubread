-- =============================================
-- Add documents column to faults table
-- =============================================

ALTER TABLE public.faults
  ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]';

-- =============================================
-- Supabase Storage: fault-documents bucket
-- Run this in Supabase SQL editor (service role required)
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('fault-documents', 'fault-documents', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- RLS policies for fault-documents storage
-- =============================================

DROP POLICY IF EXISTS "auth_select_fault_documents" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_fault_documents" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_fault_documents" ON storage.objects;

CREATE POLICY "auth_select_fault_documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fault-documents');

CREATE POLICY "auth_insert_fault_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fault-documents');

CREATE POLICY "auth_delete_fault_documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fault-documents');
