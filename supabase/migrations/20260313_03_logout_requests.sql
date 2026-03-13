-- =============================================
-- logout_requests: admin can send a "please log out" notice to all company users
-- One row per company — upserted each time the admin triggers a request
-- =============================================

CREATE TABLE IF NOT EXISTS public.logout_requests (
  company_id    text PRIMARY KEY,
  message       text NOT NULL DEFAULT 'יש לצאת מהמערכת לצורך עדכון. אנא שמור עבודתך והתנתק.',
  auto_logout_minutes integer NOT NULL DEFAULT 5,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  requested_by_name text
);

-- Enable RLS
ALTER TABLE public.logout_requests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed for the banner to work)
CREATE POLICY "auth_read_logout_requests" ON public.logout_requests
  FOR SELECT TO authenticated USING (true);

-- Only the service-role key (used by the API route) can insert/update
-- Regular users have no write access — the API route handles auth checks
CREATE POLICY "auth_insert_logout_requests" ON public.logout_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_logout_requests" ON public.logout_requests
  FOR UPDATE TO authenticated USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.logout_requests;
ALTER TABLE public.logout_requests REPLICA IDENTITY FULL;
