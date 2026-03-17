-- SMS outbox queue for deferred sending (quiet hours 07:00-20:00 Asia/Jerusalem)

CREATE TABLE IF NOT EXISTS public.sms_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.sms_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_sms_outbox" ON public.sms_outbox;
CREATE POLICY "service_role_all_sms_outbox"
  ON public.sms_outbox
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sms_outbox_status_created
  ON public.sms_outbox(status, created_at);
