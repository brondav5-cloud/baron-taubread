# מיגרציית טבלת visits ל-Supabase

כדי שמערכת הביקורים תשמור נתונים ב-Supabase, **חובה** להריץ את המיגרציה.

## אפשרות 1: Supabase CLI

```bash
supabase db push
```

## אפשרות 2: Supabase Dashboard (SQL Editor)

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט
3. לך ל-**SQL Editor** → **New query**
4. פתח את הקובץ `supabase/migrations/run_visits_standalone.sql` – העתק את **כל** תוכנו (רק SQL, ללא כותרות markdown) והדבק ב-Editor
5. לחץ **Run**

**חשוב:** אל תעתיק את MIGRATION_VISITS.md – הוא מכיל כותרות markdown שיגרמו לשגיאת syntax. השתמש רק בקובץ `run_visits_standalone.sql`.

אחרי הרצת המיגרציה, הביקורים יישמרו ויטענו אוטומטית מ-Supabase.
