# תיקון התחברות ב-Vercel

> עדכון: וודא שמשתני הסביבה מוגדרים ב-Vercel **לפני** ה-build. אחרי הוספה – Redeploy!

## שלב 1: משתני סביבה ב-Vercel

1. היכנס ל-[Vercel](https://vercel.com) → בחר את הפרויקט `baron-taubread-vtfi`
2. **Settings** → **Environment Variables**
3. וודא שיש את **שלושת** המשתנים הבאים (עם הערכים מ-.env.local):

| שם | ערך (מעתיק מ-.env.local) |
|----|--------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wxkauqhlaiyxpiebmvkb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | המפתח הארוך (מתחיל ב-eyJ...) |
| `SUPABASE_SERVICE_ROLE_KEY` | המפתח הארוך (מתחיל ב-eyJ...) |

4. עבור כל משתנה - סמן **Production**, **Preview**, **Development**
5. **חשוב:** אם הוספת/שינית משתנים – **Redeploy** (Deployments → ⋮ → Redeploy)

---

## שלב 2: הגדרת Supabase

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט (wxkauqhlaiyxpiebmvkb)
3. **Authentication** → **URL Configuration**
4. הוסף/עדכן:

   - **Site URL:** `https://baron-taubread-vtfi.vercel.app`
   - **Redirect URLs:** הוסף שורה:
     ```
     https://baron-taubread-vtfi.vercel.app/**
     ```

5. לחץ **Save**

---

## שלב 3: Redeploy ב-Vercel

אחרי עדכון משתנים – חייבים להריץ build חדש:

1. **Deployments** → לחץ על שלוש הנקודות ליד ה-deployment האחרון
2. **Redeploy** → אשר

---

## אימות

1. פתח https://baron-taubread-vtfi.vercel.app/login
2. התחבר עם אימייל וסיסמה שיצרת ב-Supabase
3. אם מופיעה שגיאה – העתק את הטקסט המלא

---

## אם עדיין מופיע "supabaseUrl is required"

משתני `NEXT_PUBLIC_*` נטמעים **בזמן ה-build**. אם הוספת משתנים אחרי ה-build, הם לא יופיעו.

**פתרון מומלץ – Push חדש ל-Git:**
```bash
git add .
git commit -m "Trigger rebuild"
git push
```
זה מפעיל build חדש עם משתני הסביבה המעודכנים.

**או – ב-Vercel:**
- Deployments → ⋮ → Redeploy (בלי לסמן "Use existing build cache")
