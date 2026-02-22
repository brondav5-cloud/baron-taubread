# מיגרציה: משימות ו-Workflows ל-Supabase

## מה נעשה

### 1. טבלאות חדשות ב-Supabase

**טבלת `tasks`** – משימות רגילות  
- כל השדות מתוך `Task` (משימה, מוקצים, צ'קליסט, הערות, היסטוריה)
- `company_id` – בידוד נתונים לפי חברה
- אינדקסים: company_id, status, store_id, created_at

**טבלת `workflows`** – משימות מורכבות  
- כל השדות מתוך `WorkflowTask` כולל `steps` כ-JSONB
- `company_id` – בידוד נתונים לפי חברה
- אינדקסים: company_id, status, created_at

### 2. קבצים חדשים

- `supabase/migrations/20260216_01_tasks_and_workflows.sql` – סקריפט מיגרציה
- `src/lib/supabase/tasks.queries.ts` – CRUD למשימות ו-workflows
- `src/lib/supabase/tasks.mappers.ts` – המרה בין Task/Workflow ל-DbTask/DbWorkflow

### 3. עדכון Context

- **TasksContext** – שימוש ב-Supabase במקום localStorage
- **WorkflowContext** – שימוש ב-Supabase במקום localStorage

כל פעולה (יצירה, עדכון סטטוס, הערות וכו') נשמרת ב-Supabase לפי `company_id`.

---

## הרצת המיגרציה

אם הפרויקט מקושר ל-Supabase:

```bash
npx supabase db push
```

אחרת, הרץ ידנית את הקובץ `supabase/migrations/20260216_01_tasks_and_workflows.sql` ב-Supabase SQL Editor.

---

## הערות

1. **אימות** – משימות נטענות רק עבור משתמש מחובר (`company_id` מ-`/api/whoami`).
2. **איפוס לדמו** – הכפתור "איפוס נתוני דמו" מוחק את כל המשימות של החברה ומכניס את נתוני הדמו.
3. **Demo users** – מזוהי המשתמש (`user_agent_moshe` וכו') נשמרים כראי, אפשר לחבר לידות משתמשים אמיתיים בעתיד.
