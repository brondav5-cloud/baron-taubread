-- Add stats JSONB column to uploads for detailed summary tracking
ALTER TABLE public.uploads
ADD COLUMN IF NOT EXISTS stats jsonb;
