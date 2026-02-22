# סיכום בעיית התחברות ב-Vercel – Handoff למתכנת

## הבעיה

**תסמין:** כשנכנסים ל-URL של האתר ב-Vercel (למשל `https://baron-taubread.vercel.app/login`) ומנסים להתחבר עם אימייל וסיסמה – מופיעה השגיאה:

```
Uncaught (in promise) Error: supabaseUrl is required.
```

**מקור השגיאה:** הספרייה `@supabase/ssr` – הפונקציה `createBrowserClient()` זורקת כשהפרמטר הראשון (`supabaseUrl`) הוא `undefined`.

**שגיאות נלוות ב-Console:**
- `api/whoami:1 Failed to load resource: the server responded with a status of 401 (Unauthorized)`
- `favicon.ico:1 Failed to load resource: 404`

---

## סביבת עבודה

| רכיב | ערך |
|------|-----|
| **פרויקט** | Bakery Analytics (Next.js 14) |
| **Auth** | Supabase (Email/Password) |
| **Git Repo** | `brondav5-cloud/baron-taubread` |
| **Vercel** | baron-taubread.vercel.app |
| **Supabase Project** | wxkauqhlaiyxpiebmvkb |

**עובד מקומית:** כן – עם `.env.local` האפליקציה רצה וההתחברות עובדת.

**לא עובד ב-Production:** ב-Vercel – השגיאה חוזרת בכל deployment.

---

## מה נעשה (כרונולוגי)

### 1. משתני סביבה ב-Vercel
- הוספת `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- סימון Production, Preview, Development
- ביצוע Redeploy לאחר כל שינוי

**תוצאה:** אותה שגיאה.

---

### 2. Supabase URL Configuration
- עדכון Site URL ל-`https://baron-taubread.vercel.app`
- הוספת Redirect URLs: `https://baron-taubread.vercel.app/**`

**תוצאה:** אותה שגיאה (וגם השגיאה קודמת לכל בקשה ל-Supabase).

---

### 3. Fallback בקוד
- קובץ חדש `src/lib/supabase/env.ts` עם fallback כשמשתני סביבה חסרים
- עדכון `client.ts`, `server.ts`, `middleware.ts` לשימוש ב-fallback

**תוצאה:** אותה שגיאה.

---

### 4. Hardcode ב-client.ts
- החלפת `process.env` במחרוזות קבועות ב-`src/lib/supabase/client.ts`:
```typescript
const SUPABASE_URL = "https://wxkauqhlaiyxpiebmvkb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs...";
```

**תוצאה:** אותה שגיאה.

---

### 5. הזרקה דרך next.config.js
```javascript
env: {
  NEXT_PUBLIC_SUPABASE_URL: "https://wxkauqhlaiyxpiebmvkb.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJ...",
},
```

**תוצאה:** אותה שגיאה.

---

### 6. מחיקת משתנים מ-Vercel
- הוצאת `NEXT_PUBLIC_SUPABASE_URL` ו-`NEXT_PUBLIC_SUPABASE_ANON_KEY` מ-Vercel
- החשד: ערכים ריקים דרסו את next.config

**תוצאה:** אותה שגיאה.

---

### 7. Cache
- ניסיון Hard Refresh (Ctrl+Shift+R)
- חלון פרטי / Incognito
- ניקוי cache בדפדפן

**תוצאה:** אותה שגיאה.

---

### 8. פרויקט חדש ב-Vercel
- מחיקת פרויקטים ישנים
- יצירת פרויקט חדש
- הוספת משתני סביבה לפני Deploy ראשון
- Deploy חדש

**תוצאה:** אותה שגיאה.

---

### 9. Literal strings בלבד
- עדכון `client.ts` לשימוש אך ורק במחרוזות קבועות – בלי `process.env`
- ביצוע Push ל-GitHub

**תוצאה:** (לא נבדק לאחרונה – המשתמש ביקש סיכום).

---

## ממצא חשוב

**ה-chunk hash אינו משתנה:** בשגיאות חוזרות מופיע אותו chunk:
`1259-72bb43eb7bbb85c0.js`

למרות שינויים בקוד – ה-hash נשאר זהה. זה יכול להצביע על:
- deployment שלא מבוסס על הקוד האחרון
- cache חזק (Vercel או CDN)
- build שאינו מריץ את השינויים האחרונים

---

## מבנה רלוונטי בפרויקט

| קובץ | תפקיד |
|------|-------|
| `src/lib/supabase/client.ts` | Supabase client לדפדפן – `createBrowserClient` |
| `src/lib/supabase/server.ts` | Supabase client לשרת |
| `src/lib/supabase/env.ts` | ערכי env עם fallback |
| `middleware.ts` | בדיקת auth, שימוש ב-Supabase |
| `next.config.js` | כולל `env` עם ערכי Supabase |
| `src/app/login/page.tsx` | עמוד התחברות – `signInWithPassword` |

---

## כיווני חקירה להמשך

1. **וידוא ה-deployment:** לוודא ש-Vercel בונה מה-commit הנכון ב-repo. לבדוק ב-Deployments איזה commit רץ.
2. **בדיקת ה-build:** להריץ build מקומי, לחפש את ה-chunk עם `supabaseUrl` ב-output.
3. **Purge Vercel CDN:** לבדוק אם Vercel מאפשר purge cache, או ליצור deployment חדש עם שינוי קטן שמאלץ URLs חדשים.
4. **שימוש ב-server-side auth בלבד:** לשקול העברת `signInWithPassword` ל-API route, כך שהדפדפן לא יריץ את Supabase client.
5. **בדיקת repo ב-Vercel:** לוודא שה-project מחובר ל-repo `brondav5-cloud/baron-taubread` ולא ל-fork או repo אחר.

---

## קבצים להעברה

- `docs/VERCEL-LOGIN-ISSUE-SUMMARY.md` (המסמך הזה)
- `src/lib/supabase/client.ts`
- `next.config.js`
- `.env.example` (מבנה משתני סביבה, בלי ערכים אמיתיים)
