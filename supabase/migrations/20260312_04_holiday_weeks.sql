-- ============================================================
-- HOLIDAY WEEKS
-- שבועות חג / עונתיות — מאפשר לסמן שבועות כחריגים
-- ממשיכים להופיע בנתונים אך יסומנו בממשק
-- ============================================================

CREATE TABLE IF NOT EXISTS public.holiday_weeks (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID    NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  week_start_date  DATE    NOT NULL,
  holiday_name     TEXT    NOT NULL DEFAULT 'חג',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, week_start_date)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.holiday_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_holiday_weeks" ON public.holiday_weeks
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_holiday_weeks_company
  ON public.holiday_weeks (company_id, week_start_date);
