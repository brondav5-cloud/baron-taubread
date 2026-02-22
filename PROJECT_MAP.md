# Bakery Analytics – מיפוי מלא של הפרויקט

## תקציר טכנולוגי
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, Tailwind CSS
- **Data:** Supabase (PostgreSQL + RLS)
- **Auth:** Firebase Auth, נתוני משתמש מ-Firestore
- **State:** TanStack React Query, React Context
- **Charts:** Recharts
- **Excel:** xlsx
- **Validation:** Zod
- **ממשק:** עברית, RTL

---

## מבנה תיקיות ראשי

```
src/
├── app/                    # App Router – דפים ו-API
├── components/             # קומפוננטות UI
├── context/                # React Context providers
├── hooks/                  # Custom hooks
├── lib/                    # לוגיקה עסקית, גישה לנתונים
├── services/               # Firebase (auth, Firestore, storage)
├── types/                  # ממשקים TypeScript
├── validations/            # סכמות Zod
├── providers/              # ספקי providers גלובליים
└── legacy/                 # קוד legacy (deprecated)
```

---

## App Router (`src/app/`)

### דפים ראשיים
| נתיב | קובץ | תיאור |
|------|------|-------|
| `/` | `page.tsx` | הפניה ל-login |
| `/login` | `login/page.tsx` | כניסה למערכת |
| `layout.tsx` | | Layout גלובלי, RTL, Heebo |
| `error.tsx`, `global-error.tsx` | | טיפול בשגיאות |

### Dashboard (`src/app/dashboard/`)
| נתיב | תיאור |
|------|-------|
| `/dashboard` | דף ראשי |
| `/dashboard/stores` | חנויות |
| `/dashboard/stores/[id]` | פרטי חנות |
| `/dashboard/products` | מוצרים |
| `/dashboard/product-development` | פיתוח מוצרים (Kanban) |
| `/dashboard/product-development/[id]` | מוצר בפיתוח |
| `/dashboard/product-development/new` | מוצר חדש |
| `/dashboard/product-development/settings` | הגדרות שלבים |
| `/dashboard/tasks` | משימות |
| `/dashboard/tasks/analytics` | אנליטיקת משימות |
| `/dashboard/faults` | תקדלות |
| `/dashboard/faults/analytics` | אנליטיקת תקדלות |
| `/dashboard/visits` | ביקורים |
| `/dashboard/visits/new` | ביקור חדש |
| `/dashboard/compare` | השוואת תקופות |
| `/dashboard/profitability` | רווחיות |
| `/dashboard/settings` | הגדרות |
| `/dashboard/settings/users` | משתמשים |
| `/dashboard/settings/task-categories` | קטגוריות משימות |
| `/dashboard/settings/fault-types` | סוגי תקדלות |
| `/dashboard/settings/fault-statuses` | סטטוסי תקדלות |
| `/dashboard/settings/driver-groups` | קבוצות נהגים |
| `/dashboard/settings/pricing` | מחירון |
| `/dashboard/settings/demo-users` | משתמשי דמו |

### API Routes
| נתיב | קובץ | תיאור |
|------|------|-------|
| `POST /api/upload` | `api/upload/route.ts` | העלאת Excel, עיבוד ושמירה ב-Supabase |
| | `api/upload/mergeUtils.ts` | מיזוג נתונים חודשיים |
| | `api/upload/types.ts` | סוגי payload העלאה |
| `GET /api/whoami` | `api/whoami/route.ts` | משתמש נוכחי |
| `GET /api/stores/[id]/products` | `api/stores/[id]/products/route.ts` | מוצרי חנות |

---

## Contexts (`src/context/`)

שרשרת ספקים (סדר חשוב):

```
QueryProvider
  → ToastProvider
    → AuthProvider
      → CompanyProvider
        → UsersProvider
          → TasksProvider
            → WorkflowProvider
              → FaultsProvider
                → StoresAndProductsProvider
                  → VisitsProvider
                    → TreatmentProvider
```

| Context | תפקיד |
|---------|-------|
| AuthContext | Firebase Auth |
| CompanyContext | חברה נוכחית מ-Firestore |
| UsersContext | משתמשי החברה, הרשאות |
| TasksContext | משימות בודדות |
| WorkflowContext | משימות מורכבות (workflows) |
| FaultsContext | תקדלות |
| StoresAndProductsContext | חנויות ומוצרים |
| VisitsContext | ביקורים |
| TreatmentContext | טיפולים |
| DemoUserContext | משתמש דמו |

---

## קומפוננטות עיקריות (`src/components/`)

| תיקייה | תיאור |
|--------|-------|
| `layout/` | Sidebar, Header, DashboardLayout, GlobalSearch |
| `common/` | SmartPeriodSelector, LoadingSpinner |
| `ui/` | Button, Card, DateRangePicker, SortableTable, MonthSelector |
| `stores/` | StoresTable (legacy) |
| `stores-supabase/` | StoresTableSupabase, StoresComponents |
| `store-detail/`, `store-detail-supabase/` | פרטי חנות |
| `compare/` | CompareTable, CompareFiltersPanel, CompareCharts |
| `tasks/` | TasksList, UnifiedTasksList, CreateTaskModal |
| `tasks/workflow/` | WorkflowDetailModal, CreateWorkflowModal |
| `product-development/` | ProductKanban, StageCard, ProductCard |
| `faults/` | FaultsList, FaultDetailModal, CreateFaultModal |
| `visits/` | StoreVisitsHistory, VisitDetailModal |
| `profitability/` | ProfitabilityTableNew |
| `treatment/` | AddToTreatmentModal |
| `settings/` | הגדרות: משתמשים, קטגוריות, תקדלות, driver groups |
| `upload/` | ממשק העלאה |

---

## Lib (`src/lib/`)

| תיקייה/קובץ | תיאור |
|-------------|-------|
| `supabase/` | client, server, queries (tasks, faults, product-development) |
| `db/` | storeProducts.repo, pricing.repo, costs.repo, driverGroups.repo |
| `storeProducts/` | normalize, validation |
| `periods/` | פונקציות תקופה/חודש |
| `excelProcessor.ts` | עיבוד Excel, חישוב מדדים |
| `periodUtils.ts` | mergePeriodLists |
| `calculations.ts` | חישובים עסקיים |
| `dataLoader.ts` | טעינת נתונים |

---

## Hooks (`src/hooks/`)

| Hook | תיאור |
|------|-------|
| useAuth | אימות |
| usePermissions | הרשאות לפי מודול |
| useStoresPageSupabase | עמוד חנויות |
| useComparisonSupabase | השוואה |
| usePeriodSelector | בחירת תקופה |
| useNewVisit | ביקור חדש |
| useProductDevelopment | פיתוח מוצרים |
| useProfitability | רווחיות |

---

## Supabase Migrations (`supabase/migrations/`)

קבצי migration לפי סדר התאריך.

---

## קישוריות וזרימת נתונים

1. **התחברות:** Firebase Auth → Firestore (profil) → users (Supabase)
2. **חנויות ומוצרים:** Supabase (stores, products, store_products)
3. **העלאת Excel:** Client → POST /api/upload → excelProcessor → Supabase
4. **משימות / Workflows:** TasksContext, WorkflowContext → tasks.queries
5. **תקדלות:** FaultsContext → faults.queries

---

## הערות תחזוקה

- **Legacy:** `src/legacy/` – ExcelUpload ישן; מומלץ להישען על flow העלאה החדש
- **קבצים שפוצלו:** WorkflowContext → `context/workflow/workflow.types.ts`; upload → `mergeUtils.ts`, `types.ts`
- **הרשאות:** ראו `docs/PERMISSIONS.md` – הסבר מלא על מנגנון ההרשאות
- **כפילות:** stores vs stores-supabase – העברה הדרגתית ל-supabase
