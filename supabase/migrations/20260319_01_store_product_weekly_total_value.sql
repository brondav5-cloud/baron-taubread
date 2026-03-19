-- Add total_value (sales) to store_product_weekly for distribution-v2
-- Source: column "סהכ" from פירוט מוצרים Excel
ALTER TABLE public.store_product_weekly
  ADD COLUMN IF NOT EXISTS total_value numeric NOT NULL DEFAULT 0;
