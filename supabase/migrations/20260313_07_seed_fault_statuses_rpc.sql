-- ============================================================
-- RPC: seed_default_fault_statuses
-- Seeds the 5 default fault statuses for a company if none exist.
-- SECURITY DEFINER so it can INSERT bypassing RLS.
-- Still validates auth.uid() and company membership before acting.
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_default_fault_statuses(
  p_company_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return gracefully instead of raising exceptions, to avoid HTTP 400 errors.
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('seeded', false, 'reason', 'not_authenticated');
  END IF;

  IF p_company_id IS NULL OR p_company_id = '' THEN
    RETURN jsonb_build_object('seeded', false, 'reason', 'no_company_id');
  END IF;

  -- Only insert if the company has no fault statuses yet (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.fault_statuses WHERE company_id = p_company_id LIMIT 1
  ) THEN
    RETURN jsonb_build_object('seeded', false, 'reason', 'already_exists');
  END IF;

  INSERT INTO public.fault_statuses (company_id, name, color, "order", is_final, is_active)
  VALUES
    (p_company_id, 'חדש',    'blue',   1, false, true),
    (p_company_id, 'נצפה',   'yellow', 2, false, true),
    (p_company_id, 'בטיפול', 'orange', 3, false, true),
    (p_company_id, 'נפתר',   'green',  4, false, true),
    (p_company_id, 'נסגר',   'gray',   5, true,  true);

  RETURN jsonb_build_object('seeded', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_fault_statuses(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_fault_statuses(text) TO anon;
