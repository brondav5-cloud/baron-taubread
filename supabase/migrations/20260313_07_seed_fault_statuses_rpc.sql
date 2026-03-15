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
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: must be authenticated';
  END IF;

  -- Must have access to the company
  IF NOT public.user_has_company_access_text(p_company_id) THEN
    RAISE EXCEPTION 'Forbidden: no access to company %', p_company_id;
  END IF;

  -- Only insert if the company has no fault statuses yet
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.seed_default_fault_statuses(text) TO authenticated;
