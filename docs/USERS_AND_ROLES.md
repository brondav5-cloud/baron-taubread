# משתמשים ותפקידים – המשימות והתקלות

## איפה זה יושב היום

| מקור | קובץ | שימוש |
|------|------|-------|
| **משתמשי דמו** | `src/lib/data/tasks-demo.json` | משימות, תקלות, קטגוריות, workflows |
| **משתמש מחובר** | Supabase `public.users` | Auth, company_id, role (admin/editor/viewer) |

### tasks-demo.json – מבנה

```json
{
  "users": [
    {
      "id": "user_agent_moshe",
      "name": "משה כהן",
      "role": "agent",
      "avatar": "👨‍💼",
      "email": "moshe@bakery.com",
      "department": "מכירות שטח"
    }
  ]
}
```

**תפקידים זמינים:** `agent`, `warehouse_manager`, `pricing_manager`, `logistics_manager`, `accountant`, `quality_manager`, `sales_manager`, `admin`

תפקידים אלה מוגדרים ב-`src/types/task.ts` ב-`DEMO_USER_ROLE_CONFIG`.

---

## איך לשנות שמות ותפקידים כרגע

1. פתח `src/lib/data/tasks-demo.json`
2. ערוך את מערך `users` – `name`, `role`, `department`, `avatar` וכו'
3. שמור את הקובץ (האפליקציה תיטען מחדש)

---

## איך זה הכי טוב שיישב

### מצב דמו (ללא Auth)
- **אופציה א'**: להשאיר JSON ולבנות דף הגדרות "משתמשי דמו" – עריכה דרך הממשק, שמירה ב-localStorage.
- **אופציה ב'**: לערוך ישירות את `tasks-demo.json`.

### מצב פרודקשן (עם Auth)
- שימוש ב-Supabase `public.users`:
  - `id`, `company_id`, `email`, `name`, `role`
- הרחבת `public.users` (או טבלת `team_members`) לשדות: `department`, `avatar`, תפקידי דמו (סוכן, מנהל מחסן וכו').
- הרצת שאילתה: טעינת משתמשי החברה (`company_id`) והצגתם ב־Tasks, Faults וכו'.

### המלצה
- **דמו:** דף הגדרות "משתמשי דמו" עם שמירה ב-localStorage (כמו קטגוריות).
- **פרודקשן:** משתמשים מ-Supabase `public.users` (או טבלת משתמשים מורחבת).
