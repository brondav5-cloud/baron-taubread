-- Add file_hash column to bank_uploaded_files for duplicate detection
ALTER TABLE public.bank_uploaded_files
  ADD COLUMN IF NOT EXISTS file_hash text;

CREATE INDEX IF NOT EXISTS idx_bank_uploaded_files_hash
  ON public.bank_uploaded_files(company_id, file_hash)
  WHERE file_hash IS NOT NULL;
