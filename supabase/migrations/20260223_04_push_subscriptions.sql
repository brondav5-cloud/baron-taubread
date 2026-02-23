-- Push notification subscriptions for Web Push API
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_subscriptions"
  ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_role_all_subscriptions"
  ON public.push_subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_subs_company ON public.push_subscriptions(company_id);

-- Notifications log (tracks what was sent)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_reassigned', 'fault_assigned', 'fault_status', 'reminder', 'general')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  reference_id TEXT,
  reference_type TEXT CHECK (reference_type IN ('task', 'fault', 'treatment')),
  channel TEXT NOT NULL DEFAULT 'push' CHECK (channel IN ('push', 'email', 'whatsapp', 'in_app')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_notifications"
  ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

CREATE POLICY "users_update_own_notifications"
  ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

CREATE POLICY "service_role_all_notifications"
  ON public.notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_company ON public.notifications(company_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_user_id, read_at) WHERE read_at IS NULL;
