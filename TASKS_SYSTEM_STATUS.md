# סטטוס מערכת המשימות – בדיקה מלאה

## מה נבדק

### 1. מבנה הנתונים

| רכיב | מיקום | איפה נשמר |
|------|--------|-----------|
| **משימות רגילות** | `TasksContext` | Supabase (`tasks`), לפי `company_id` |
| **משימות מורכבות** | `WorkflowContext` | Supabase (`workflows`), לפי `company_id` |
| **משתמשי דמו** | `DemoUserContext` | localStorage |
| **קטגוריות משימות** | `DemoUserContext` | localStorage |

### 2. זרימת אימות

- **useAuth** → `/api/whoami` → Supabase Auth + טבלת `users`
- מחזיר: `userId` (UUID), `companyId`, `role`
- כשהמשתמש לא מחובר: `companyId = null` → משימות ו-workflows ריקים

### 3. שימוש ב-Demo Users

- `currentUser` מ-`DemoUserContext` (למשל `user_agent_moshe`, `משה כהן`)
- משימות משתמשות ב-`createdBy` ו-`assignees` עם ה-ids של הדמו
- זה עובד כי `company_id` מבדיל בין חברות, וה-demo users הם "תפקידים" בתוך החברה

### 4. דפים ורכיבים שמשתמשים במשימות

| רכיב | שימוש |
|------|--------|
| `/dashboard/tasks` | רשימת משימות + workflows, יצירה, סטטיסטיקות |
| `/dashboard/tasks/analytics` | גרפים וניתוח משימות |
| `Header` | מונה "חדש אצלי", "ממתין לאישור", "באיחור" |
| `TaskStatsCards` | כרטיסים לפי סינון |
| `UnifiedTasksList` | רשימה מאוחדת עם סינון |
| `CreateTaskModal` | יצירת משימה חדשה |
| `TaskDetailModal` | צפייה ועריכת משימה |
| `CreateWorkflowModal` | יצירת workflow |
| `WorkflowDetailModal` | צפייה ועריכת workflow |
| `VisitDetailModal` | כפתור "משימה לחנות" |

### 5. אינטגרציות

| אינטגרציה | סטטוס |
|------------|--------|
| **ביקור → משימה** | עובד – כפתור "שמור ועבור למשימה" ועדכון sessionStorage |
| **תעודת ביקור → משימה** | עובד – CreateTaskModal עם storeId/storeName |
| **קישור לחנות** | עובד – תמיכה ב-external_id ב-URL |
| **תכנון עבודה (work-plan)** | **לא מקושר** – הביקורים והמשימות שם נשמרים רק בזיכרון (state מקומי). אין שמירה ב-Supabase. |

---

## בעיות אפשריות

### 1. טבלאות לא קיימות

אם לא הרצת את המיגרציה, הקריאות ל-Supabase ייכשלו בשקט ותשורנה מערכים ריקים.

**פתרון:** הרץ את `supabase/migrations/20260216_01_tasks_and_workflows.sql` ב-SQL Editor של Supabase.

### 2. משתמש לא מחובר

כש-`auth.status === 'anon'` אין `companyId`, ולכן:
- `tasks = []`, `workflows = []`
- יצירת משימה לא תישמר (ה-insert לא רץ)
- "איפוס לדמו" לא יעשה כלום

### 3. עיכוב בהופעת משימה חדשה

יצירת משימה היא אסינכרונית: המודל נסגר מיד, וה־insert רץ ברקע. המשימה תופיע רק אחרי שהשרת מחזיר תשובה.

### 4. RLS (Row Level Security)

אין RLS על `tasks` ו-`workflows`. הסינון לפי `company_id` נעשה בשכבת האפליקציה בלבד.

---

## מה עובד

- משימות ו-workflows נשמרים ב-Supabase לפי `company_id`
- כל הפעולות (יצירה, עדכון סטטוס, הערות, צ'קליסט, מוקצים) נשמרות
- סינון לפי משתמש (דמו) – "אצלי", "ממתין לאישור", "באיחור"
- דוחות אנליטיקה
- "איפוס לדמו" – מחיקה והכנסת נתוני דמו

---

## תכנון עבודה (work-plan)

- ביקורים ומשימות שנבנים בתכנון עבודה **לא** נשמרים ב-Supabase
- מדובר בלוח תכנון שבועי מקומי
- אם צריך לשמור – יש לחבר ל-`VisitsContext` ו-`TasksContext`
