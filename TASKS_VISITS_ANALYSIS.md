# ניתוח משימות וביקורים – ממצאים והמלצות

## מבנה המערכת הנוכחי

### דף משימות (`/dashboard/tasks`)
- **משימות רגילות** – יצירה דרך כפתור "משימה חדשה", CreateTaskModal
- **משימות מורכבות** – Workflow עם מספר שלבים, CreateWorkflowModal
- **דוחות** – קישור לדף `/dashboard/tasks/analytics` (ניתוח)
- **נתוני דמו** – TasksContext משתמש ב-localStorage + tasks-demo.json (לא Supabase)

### דף ביקורים
- **כל הביקורים** – `/dashboard/visits` – רשימת ביקורים + חנויות
- **הוסף ביקור** – `/dashboard/visits/new` – טופס ביקור חדש
- **VisitsContext** – משתמש ב-Supabase (טבלת visits)

### תכנון עבודה – `/dashboard/work-plan`
- תצוגת שבוע עם ביקורים ומשימות
- מודלים: הוסף ביקור, הוסף משימה
- מתחבר ל-VisitsContext ו-TasksContext

---

## באגים שזוהו

### 1. כפתור "שמור ועבור למשימה" חסר בטופס ביקור חדש
- **מיקום**: `useNewVisit.ts` יש `handleSubmitAndCreateTask` – שומר ביקור, שומר `createTaskStore` ב-sessionStorage, ועובר לדף משימות
- **בעיה**: הכפתור לא מוצג ב-`visits/new/page.tsx` – יש רק "שמור ביקור" שקורא ל-`handleSubmit`
- **תוצאה**: אין דרך להעביר ישירות מהביקור לדף משימות עם החנות כברירת מחדל

### 2. דף המשימות לא קורא מ-sessionStorage
- **מיקום**: `tasks/page.tsx` – `handleCreateTask` מאפס את `selectedStoreId` ופותח מודל
- **בעיה**: אף פעם לא נבדק `sessionStorage.getItem('createTaskStore')` – גם אם ננווט מהביקור, המודל ייפתח בלי חנות
- **תוצאה**: הזרימה "שמור ביקור → עבור למשימה" לא מתבצעת בפועל

### 3. קישור "חנות" בתעודת ביקור שבור
- **מיקום**: `VisitDetailModal.tsx` – `href={/dashboard/stores/${visit.storeId}}`
- **בעיה**: `visit.storeId` הוא `external_id` (מספר), בעוד ש-`useStoreDetailSupabase` מחפש לפי `id` (UUID) עם `.eq('id', storeId)`
- **תוצאה**: לחיצה על שם החנות מובילה ל-"החנות לא נמצאה"
- **פתרון מוצע**: להרחיב את `useStoreDetailSupabase` – אם `params.id` נראה כמספר, לשאוב לפי `external_id`; אחרת לפי `id` (UUID)

### 4. CreateTaskModal – חנות מוקפאת
- **מיקום**: `TaskTypeSelector.tsx` – כש-`initialStoreName` קיים, מוצג div קבוע
- **בעיה**: אין אפשרות לבחור חנות אחרת מרשימה; יש רק "הקלד שם חנות" כשאין initialStoreName

---

## אי-התאמות ומורכבות

### 5. TasksContext vs Supabase
- **מצב נוכחי**: משימות נשמרות ב-localStorage (דמו), לא ב-Supabase
- **השלכה**: אין סנכרון בין משתמשים או מכשירים; נתונים יכולים להימחק

### 6. WorkflowsContext
- **מצב**: WorkflowContext נפרד, גם הוא כנראה דמו/local
- **שאלה**: האם Workflows אמורים להישמר ב-DB?

### 7. DemoUserContext
- **מצב**: דף משימות משתמש ב-DemoUserSwitcher לניהול "משתמשים" לדמו
- **השלכה**: בפועל אין אימות אמיתי; כל המשתמשים רואים את אותן המשימות

### 8. משימות רגילות vs מורכבות
- **רגילות**: Task פשוט, CreateTaskModal
- **מורכבות**: Workflow עם שלבים, CreateWorkflowModal
- **הערה**: אין מעבר ברור בין "משימה רגילה" ל-"משימה מורכבת" לאותה חנות

---

## המלצות לשיפור

### בעדיפות גבוהה
1. **הוספת כפתור "שמור ועבור למשימה"** – בטופס ביקור חדש, ליד "שמור ביקור"
2. **קריאת sessionStorage בדף משימות** – ב-useEffect, לבדוק `createTaskStore` ולפתוח CreateTaskModal עם החנות
3. **תיקון קישור חנות בתעודת ביקור** – שמירת `storeUuid` ב-Visit או טעינה לפי `external_id` בדף החנות

### בעדיפות בינונית
4. **בחירת חנות ב-CreateTaskModal** – כשנפתח מחנות/ביקור, לאפשר החלפת חנות מרשימה
5. **ניקוי sessionStorage** – אחרי פתיחת המודל עם חנות, למחוק את `createTaskStore`

### לשיקול עתידי
6. **מעבר מ-localStorage ל-Supabase** – לשמירת משימות וסקינכרון אמיתי
7. **חיזוק הקשר ביקור–משימה** – קישור משימה לביקור ספציפי (visitId) כבר קיים בחלק מהממשקים
8. **תפריט/טאבים בדף משימות** – הפרדה ברורה בין משימות רגילות, מורכבות ודוחות

---

## קבצים מרכזיים

| תפקיד | קובץ |
|-------|------|
| דף משימות | `app/dashboard/tasks/page.tsx` |
| דף דוחות | `app/dashboard/tasks/analytics/page.tsx` |
| דף ביקור חדש | `app/dashboard/visits/new/page.tsx` |
| Hook ביקור חדש | `hooks/useNewVisit.ts` |
| מודל פרטי ביקור | `components/visits/VisitDetailModal.tsx` |
| מודל משימה חדשה | `components/tasks/CreateTaskModalNew.tsx` |
| הקשר משימות | `context/TasksContext.tsx` |
| הקשר Workflows | `context/WorkflowContext.tsx` |
| דף תכנון עבודה | `app/dashboard/work-plan/page.tsx` |
