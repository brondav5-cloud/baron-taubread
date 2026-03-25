-- ─── checks_registry ──────────────────────────────────────────────────────────
-- Stores checks printed/issued by the company so bank transactions can be
-- automatically matched: reference (= check number) + debit (= amount) → supplier name.

CREATE TABLE IF NOT EXISTS public.checks_registry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  check_number  text NOT NULL,           -- מס שיק (stored as text to match bank reference field)
  amount        numeric(14,2) NOT NULL,  -- סכום
  supplier_name text NOT NULL,           -- שם לקוח
  check_date    date,                    -- תאריך שיק (when the check is due, not issued)
  is_cancelled  boolean NOT NULL DEFAULT false,
  source_file   text,                    -- original uploaded filename
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate checks from the same company
CREATE UNIQUE INDEX IF NOT EXISTS checks_registry_company_check_amount
  ON public.checks_registry (company_id, check_number, amount);

ALTER TABLE public.checks_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_checks_registry" ON public.checks_registry
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Add supplier_name to bank_transactions ────────────────────────────────────
-- Populated automatically by match_checks_registry() when a check row is matched.

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS supplier_name text;

-- ─── Matching function ─────────────────────────────────────────────────────────
-- Matches unmatched bank transactions (supplier_name IS NULL) against the
-- checks_registry using check_number = reference AND amount = debit.
-- Returns the number of rows updated.

CREATE OR REPLACE FUNCTION public.match_checks_registry(p_company_id uuid)
RETURNS integer AS $$
DECLARE
  matched_count integer;
BEGIN
  UPDATE public.bank_transactions bt
  SET supplier_name = cr.supplier_name
  FROM public.checks_registry cr
  WHERE bt.company_id = p_company_id
    AND cr.company_id = p_company_id
    AND bt.reference  = cr.check_number
    AND bt.debit      = cr.amount
    AND cr.is_cancelled = false
    AND bt.supplier_name IS NULL;

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RETURN matched_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
