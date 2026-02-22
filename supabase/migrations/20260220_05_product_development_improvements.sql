-- =============================================
-- Product Development - שיפורים
-- =============================================

-- 1. assignees - הקצאה למספר משתמשים בשלב
ALTER TABLE product_stages ADD COLUMN IF NOT EXISTS assignees jsonb DEFAULT '[]';
COMMENT ON COLUMN product_stages.assignees IS 'מערך: [{user_id, user_name}]';

-- 2. stage_feedback - תיאור מלא (בעיות, מה לא טוב, הערות)
ALTER TABLE product_stages ADD COLUMN IF NOT EXISTS stage_feedback text;
COMMENT ON COLUMN product_stages.stage_feedback IS 'תיאור מלא: בעיות במתכון, מה לא טוב, הערות מפורטות';

-- 3. development_reminders - תמיכה בתאריך+שעה
ALTER TABLE development_reminders ADD COLUMN IF NOT EXISTS reminder_datetime timestamptz;
COMMENT ON COLUMN development_reminders.reminder_datetime IS 'תאריך ושעה לתזכורת';
