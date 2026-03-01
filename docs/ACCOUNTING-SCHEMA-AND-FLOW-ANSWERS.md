# תשובות מפורטות — מבנה וזרימת העלאת קבצים

## 1. שאלות על המבנה הקיים

### 1.1 סכמת טבלת `transactions` (מלאה)

```sql
-- מ-001_accounting.sql (שורות 41-58)
CREATE TABLE public.transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id               UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  account_id            UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  group_code            TEXT NOT NULL,
  original_account_name TEXT,
  transaction_date      DATE NOT NULL,
  value_date            DATE,
  debit                 NUMERIC(15,2) DEFAULT 0,
  credit                NUMERIC(15,2) DEFAULT 0,
  description           TEXT,           -- ← col12, כולל בד"כ שם ספק (M)
  counter_account       TEXT,           -- ← col7, ח"ן נגדי (H)
  reference_number      TEXT,
  header_number         TEXT,
  movement_number       TEXT
);
-- + company_id (נוסף במיגרציה 20260227_01)
```

| עמודה | קיים? | הערות |
|-------|-------|-------|
| **counter_account** | ✅ כן | עמודה H — ח"ן נגדי |
| **description** | ✅ כן | עמודה M — תיאור, לרוב כולל שם ספק |
| **supplier_name** | ❌ אין | אין עמודה נפרדת; description משמש גם כשם ספק |

**המפרט:** col12 = "שם ספק/לקוח". בקוד הנוכחי col12 נשמר כ-`description`. בפועל זה אותו ערך — בכרטסת התיאור לרוב שם הספק.

---

### 1.2 סכמת טבלת `companies`

```sql
-- מ-supabase-schema.sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

**`id` הוא UUID** — לא TEXT.

---

### 1.3 סכמת טבלת `accounts`

```sql
-- מ-001_accounting.sql
CREATE TABLE public.accounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code               TEXT NOT NULL,          -- מפתח חשבון (B)
  name               TEXT NOT NULL,
  latest_group_code  TEXT,                  -- ← קוד קבוצה (C) מהכרטסת
  account_type       TEXT NOT NULL CHECK (account_type IN ('revenue', 'expense')),
  UNIQUE (user_id, code)
);
```

| עמודה | קיים? | הערות |
|-------|-------|-------|
| **group_code** | ❌ אין | יש `latest_group_code` — קוד הקבוצה (C) בשורה האחרונה של החשבון בקובץ |

---

### 1.4 סכמת טבלת `uploaded_files`

```sql
-- מ-001_accounting.sql
CREATE TABLE public.uploaded_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  year        INTEGER NOT NULL,
  month       INTEGER,
  file_type   TEXT NOT NULL CHECK (file_type IN ('yearly', 'monthly')),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  row_count   INTEGER,
  status      TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
  error_msg   TEXT
);
```

| עמודה | קיים? |
|-------|-------|
| **date_range** | ❌ אין |
| **period** | ❌ אין (יש year + month) |

**טווח התאריכים** ניתן לחישוב מתוך `transactions` לפי `transaction_date`, או מהסטטיסטיקות שמחזיר הפרסר (`stats.dateRange`).

---

## 2. שאלות על ה-seed

### 2.1 בעיית group_code 700/701 — הכנסות לעומת קניות

**המצב:**

- במפרט: 700 ו־701 = **קניות חומרי גלם**
- בפועל: בכרטסות רבות 6xx = הכנסות, 7xx/8xx = הוצאות; 700–701 יכולים להיות הכנסות

**ההבדל בין המיגרציות:**

| מיגרציה | קבוצה | group_codes | parent_section |
|---------|--------|-------------|----------------|
| 001_accounting | קניות חומרי גלם | 700, 701 | cost_of_goods |
| 002_account_codes | הכנסות | 600–603 | revenue |
| 002_account_codes | הכנסות פטורות | 700 | revenue |
| 002_account_codes | עלות ייצור - קניות | 700, 701 | cost_of_goods |

**סתירה:** ב־002, 700 מופיע גם כ"הכנסות פטורות" וגם כ"קניות חומר גלם" — זה לא עקבי.

**המלצה:**

1. **לא להניח קודים קבועים** — כל חברה יכולה להשתמש בקודים שונים.
2. **Seed ריק** — קבוצות בלי `group_codes` / `account_codes`.
3. **חישוב בזמן העלאה** — ניתוח קודי החשבון מהקובץ והצעת מיפוי.
4. **או תבניות לפי סוג עסק** — בחירת תבנית (מאפייה / מסעדה וכו') עם קודים מוגדרים מראש.

---

## 3. שאלות על הזרימה

### 3.1 איך תנועות מקושרות לספקים?

**יש `counter_account` ב־transactions.**

```sql
-- transactions כולל:
counter_account  TEXT   -- ח"ן נגדי (H) — עמודה 7
description     TEXT   -- תיאור (M) — עמודה 12, לעיתים שם ספק
```

**Phase 3 (supplier build)** יכול:

1. לשאוב תנועות לפי `company_id` (אחרי מיגרציית company_id).
2. לכל תנועה: `counter_account` (H) ו־`description` (M).
3. לפי H:
   - אם H ב־`transit_accounts` → ספק לפי M (name_based).
   - אחרת → ספק לפי H (counter_account).
4. יצירת/עדכון `suppliers` + `supplier_names`.

**אין `supplier_id` על transactions** — החיבור הוא דרך H ו־M, לא דרך מפתח זר.

---

### 3.2 מה קורה במחיקת קובץ?

**אין `file_id` על suppliers.**

לפי המפרט:

- `POST /api/accounting/files/:fileId/delete`:
  1. מוחק תנועות של fileId.
  2. מוחק רשומת `uploaded_files`.
  3. **suppliers, supplier_merges, supplier_classifications נשארים.**

הספקים אינם מקושרים לקובץ — הם לפי H/M. גם אחרי מחיקת קובץ, ספקים שנבנו ממנו נשארים; אם אין תנועות, הם פשוט לא יוצגו או יוצגו עם 0.

אין צורך לדעת "מאיזה קובץ נוצר ספק" — הספקים הם שכבת ניתוח נפרדת.

---

### 3.3 Flow מלא — העלאת קובץ (כולל Phase 3) — פסאודו־קוד

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. משתמש בוחר קובץ + שנה + סוג (שנתי/חודשי)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Client: processAccountingExcel(file)                                     │
│    • SheetJS קורא Excel                                                      │
│    • לולאה על שורות:                                                          │
│      - כותרת חשבון (col0,1,2) → accountsMap.set(code, {name, group_code})    │
│      - תנועה (col3-15) → transactions.push({                                 │
│            account_code, group_code, transaction_date, debit, credit,        │
│            description, counter_account, header_number, movement_number     │
│          })                                                                  │
│    • Return: { accounts, transactions, stats }                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. (חדש מהמפרט) בדיקת כפילות                                                  │
│    GET /api/accounting/files?company_id=X                                    │
│    if יש uploaded_files עם year/month חופף ל-stats.dateRange:                  │
│      → הצג "קיים קובץ [X]. למחוק ולהעלות?"                                    │
│      → if אישור: DELETE transactions WHERE file_id=oldId, DELETE uploaded_files│
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Phase 1: POST /api/accounting/upload                                     │
│    Body: { filename, year, month, fileType, accounts, totalTransactions }    │
│    • INSERT uploaded_files (status: processing)                              │
│    • UPSERT accounts (new → INSERT, existing → UPDATE name, group_code)      │
│    • return { fileId }                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. Phase 2: POST /api/accounting/upload/batch (לולאה)                        │
│    Body: { fileId, transactions: chunk, isLast }                             │
│    • codeToId = SELECT accounts WHERE code IN batch_codes                    │
│    • FOR each tx:                                                             │
│        accountId = codeToId.get(tx.account_code)                              │
│        INSERT transactions (account_id, counter_account, description, ...)   │
│    • if isLast:                                                               │
│        UPDATE uploaded_files SET status='completed'                           │
│        if custom_groups.count === 0: seed_default_custom_groups(companyId)    │
│    • return { inserted, skipped }                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. Phase 3 (חדש): POST /api/accounting/suppliers/build                        │
│    Body: { company_id, file_id }                                             │
│                                                                              │
│    // 3.1 זיהוי transit (בהעלאה ראשונה)                                       │
│    H_to_names = GROUP BY counter_account: Set(description) per company       │
│    is_transit(H, unique_names_count) =                                        │
│      H contains non-digit (e.g. "כ.א 2805", "מע\"מ")  OR  unique_names > 10  │
│    FOR each (H, names) WHERE is_transit(H, names.size):                       │
│      INSERT transit_accounts (company_id, counter_account) ON CONFLICT DO .. │
│                                                                              │
│    // 3.2 בניית ספקים — מכל התנועות של החברה (לא רק file_id)                   │
│    txList = SELECT * FROM transactions WHERE company_id=?                     │
│    FOR each tx in txList:                                                     │
│      H = tx.counter_account, M = normalize(tx.description)  // trim+collapse spaces │
│      if H in transit_accounts:                                                 │
│        ident = (name_based, M)  // M already trimmed                         │
│        display = M                                                            │
│      else:                                                                    │
│        ident = (counter_account, H)                                          │
│        display = mode(M for this H)  // השם הנפוץ ביותר                       │
│                                                                              │
│      UPSERT suppliers (company_id, identifier_type, identifier_value, ...)   │
│      UPSERT supplier_names (supplier_id, name=M, occurrence_count++)         │
│                                                                              │
│    // 3.3 סימון ספקים חדשים                                                   │
│    newSuppliers = suppliers created in this run                               │
│    (is_manually_classified=false מסמן ⚠️)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. Client: onUploadComplete() → refetch data                                 │
│    useAccountingData מקבל accounts, transactions, custom_groups...          │
│    calcYearlyPnl מחשב רו"ה                                                   │
│    מסך ספקים מקבל suppliers מ-GET /api/accounting/suppliers                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. סיכום נקודות לתיקון

| נושא | מצב נוכחי | נדרש |
|------|-----------|------|
| counter_account | ✅ קיים | — |
| description (M) | ✅ קיים | אופציונלי: שדה `supplier_name` נפרד אם M≠description |
| companies.id | UUID | — |
| accounts.group_code | `latest_group_code` | — |
| uploaded_files.date_range | ❌ | חישוב מ-transactions או מ-stats |
| seed group_codes | 700,701=קניות (לא תמיד נכון) | seed ריק או תבניות לפי סוג עסק |
| Phase 3 | ❌ לא קיים | ליצור suppliers/build |
| קישור תנועות↔ספקים | דרך H,M (לא supplier_id) | כפי שמתואר |
| מחיקת קובץ | suppliers נשארים | כפי שמתואר במפרט |

---

## 5. תשובות להערות ותיקונים (סבב 2)

### 5.1 company_id — TEXT או UUID?

**גישה שנבחרה: אפשרות א — UUID עם FK.**

```sql
company_id UUID NOT NULL REFERENCES companies(id)
```

**נימוקים:**
- **עקביות** — companies.id הוא UUID, שאר הטבלאות במערכת (stores, products וכו') משתמשות ב-UUID
- **Integrity** — FK מונע company_id לא תקין
- **חיסכון** — 16 bytes vs 36 bytes
- **user_has_company_access** — כבר קיים overload ל-UUID (מ-20260223_02)

המיגרציות עודכנו ל-UUID + REFERENCES.

---

### 5.2 seed ריק — מה קורה בהעלאה ראשונה?

**כן, calcYearlyPnl עובד גם בלי custom_groups.**

ב-`buildClassifier`:
```typescript
const group = getEffectiveGroup(tx.account_id, tx.group_code);
const section: ParentSection = group?.parent_section ?? "other";
```

אם אין קבוצות → `getEffectiveGroup` מחזיר null → `section = "other"`.

**התוצאה:** כל ההוצאות נופלות ל-`bySection.other`. הרו"ה עדיין מחושב: revenue, grossProfit, netProfit — הכל עובד. רק הפירוט לפי קבוצות (קניות, תפעול, הנהלה) יהיה ריק, והכל ב-"אחר".

**מסך "חשבונות ללא סיווג"** יציג את כל החשבונות — המשתמש יוכל לשייך ידנית או להוסיף account_codes לקבוצות.

---

### 5.3 Phase 3 — ספקים אחרי מחיקת קובץ שנתי

**כן, זה תקין.**

תרחיש: העלאה שנתית → העלאה חודשית (ינואר) → מחיקת השנתי. ספקים של פברואר–דצמבר נשארים ב-suppliers בלי תנועות.

**למה זה OK:**
1. **ללא supplier_id ב-transactions** — הספקים הם שכבת ניתוח, לא חלק מהתנועות
2. **מסך ספקים** — יציג ספקים עם 0 תנועות (או יסתיר אותם לפי filter)
3. **העלאה חוזרת** — כשמעלים שוב קבצים, אותם ספקים יתעדכנו (occurrence_count וכו')

**אלטרנטיבה:** לרוקן suppliers שמקושרים רק לתנועות של קבצים שנמחקו — מורכב (אין קישור ישיר file→supplier) ולא הכרחי. המפרט קובע: suppliers נשארים.

---

### 5.4 transit_accounts — threshold + H עם אותיות

**תוספת: `H מכיל אותיות → transit`.**

```
is_transit(H, unique_names_count) =
  H contains non-digit (e.g. "כ.א 2805", "מע"מ")  → true
  OR unique_names_count > 10                        → true
  ELSE                                              → false
```

ערכי H כמו "כ.א 2805", "מע\"מ", "בנק" — תמיד חשבונות מעבר. הגיוני לזהות אותם לפי תווים לא-מספריים.

---

### 5.5 normalize(M) — הגדרה

**נרמול מינימלי:**

```typescript
function normalizeSupplierName(m: string): string {
  return m.trim();
}
```

בעברית אין uppercase/lowercase משמעותי. `trim` מספיק.

**אם יידרש נרמול חזק יותר (לעברית):**
- הסרת ניקוד
- אפשור טיפול ב-encoding
- איחוד רווחים מרובים: `m.trim().replace(/\s+/g, ' ')`

**הגדרה סופית:** `trim().replace(/\s+/g, ' ')` — איחוד רווחים מרובים.
