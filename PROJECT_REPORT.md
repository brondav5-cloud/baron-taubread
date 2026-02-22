# דו"ח מקיף – Bakery Analytics Project

## 1. מבנה התיקיות

```
src/app/api/stores/[id]/products/route.ts
src/app/api/upload/route.ts
src/app/api/whoami/route.ts
src/app/dashboard/compare/page.tsx
src/app/dashboard/competitors/page.tsx
src/app/dashboard/products/[id]/page.tsx
src/app/dashboard/products/page.tsx
src/app/dashboard/profitability/page.tsx
src/app/dashboard/settings/checklist/page.tsx
src/app/dashboard/settings/competitors/page.tsx
src/app/dashboard/settings/costs/page.tsx
src/app/dashboard/settings/driver-groups/page.tsx
src/app/dashboard/settings/networks/page.tsx
src/app/dashboard/settings/pricing/page.tsx
src/app/dashboard/settings/task-categories/page.tsx
src/app/dashboard/settings/layout.tsx
src/app/dashboard/settings/page.tsx
src/app/dashboard/stores/[id]/page.tsx
src/app/dashboard/stores/page.tsx
src/app/dashboard/tasks/analytics/page.tsx
src/app/dashboard/tasks/page.tsx
src/app/dashboard/treatment/page.tsx
src/app/dashboard/upload/page.tsx
src/app/dashboard/visits/new/page.tsx
src/app/dashboard/visits/page.tsx
src/app/dashboard/work-plan/page.tsx
src/app/dashboard/layout.tsx
src/app/dashboard/page.tsx
src/app/login/page.tsx
src/app/layout.tsx
src/app/page.tsx
src/components/common/ErrorBoundary.tsx
src/components/common/index.ts
src/components/common/LoadingSpinner.tsx
src/components/common/MetricsPeriodLabel.tsx
src/components/common/SmartPeriodSelector.tsx
src/components/compare/*.tsx
src/components/dashboard/*.tsx
src/components/layout/*.tsx
src/components/product-detail/*.tsx
src/components/products/*.tsx
src/components/profitability/*.tsx
src/components/settings/costs/*.tsx
src/components/settings/driver-groups/*.tsx
src/components/settings/task-categories/*.tsx
src/components/store-detail-supabase/*.tsx
src/components/stores-supabase/*.tsx
src/components/treatment/*.tsx
src/components/visits/*.tsx
src/context/*.tsx
src/hooks/*.ts
src/lib/*.ts
src/providers/*.tsx
src/types/*.ts
```

**סה"כ: 328 קבצי .ts/.tsx ב-src**

---

## 2. ספירת שורות – קבצים קריטיים

| קובץ | שורות |
|------|-------|
| src/app/dashboard/stores/[id]/page.tsx | 117 |
| src/hooks/useStoreDetailSupabase.ts | 230 |
| src/hooks/useStoreCityComparison.ts | 150 |
| src/hooks/useStoreDetail.ts | 166 |
| src/hooks/useStoreProducts.ts | 92 |
| src/hooks/useStoreProfitability.ts | 94 |
| src/hooks/useStores.ts | 214 |
| src/hooks/useStoresPage.ts | 323 |
| src/hooks/useStoresPageSupabase.ts | 369 |
| src/components/store-detail-supabase/StoreDetailHeader.tsx | 94 |
| src/components/store-detail-supabase/StoreMetricsCards.tsx | 113 |
| src/components/store-detail-supabase/StoreMonthlyTable.tsx | 100 |
| src/components/store-detail-supabase/StoreCityComparison.tsx | 119 |
| src/components/store-detail-supabase/StoreProductsTab.tsx | 171 |
| src/components/store-detail-supabase/StoreSummaryCards.tsx | 87 |
| src/components/store-detail-supabase/StoreSalesChart.tsx | 56 |
| src/components/store-detail-supabase/StoreTabs.tsx | 61 |
| src/components/store-detail-supabase/CityRankingCards.tsx | 72 |

---

## 3. בדיקת TypeScript

```bash
npx tsc --noEmit 2>&1
```

**תוצאה:** 28 שגיאות – כולן קשורות לקבצים חסרים ב-`.next/types/**/*.ts`.

ה-`tsconfig.json` כולל את `".next/types/**/*.ts"` – הקבצים נוצרים רק אחרי `npm run build`. זה לא באג בקוד, אלא מצב שבו `tsc` רצה לפני בנייה מלאה.

**הערה:** הרצת `npm run build` עוברת בהצלחה, והקבצים ב-`src` תקינים.

---

## 4. בדיקת Build

```bash
npm run build 2>&1 | tail -50
```

**תוצאה:**

```
   Generating static pages (7/28) 
✅ Data loaded: 558 stores, 84 products
   Generating static pages (14/28) 
✅ Data loaded: 558 stores, 84 products
   Generating static pages (21/28) 
✅ Data loaded: 558 stores, 84 products
✅ Data loaded: 558 stores, 84 products
 ✓ Generating static pages (28/28)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    143 B          87.8 kB
├ ○ /_not-found                          880 B          88.5 kB
├ ƒ /api/stores/[id]/products            0 B                0 B
├ ƒ /api/upload                          0 B                0 B
├ ƒ /api/whoami                          0 B                0 B
├ ○ /dashboard                           7.23 kB         275 kB
├ ○ /dashboard/compare                   14.7 kB         279 kB
├ ○ /dashboard/competitors               3.76 kB         109 kB
├ ○ /dashboard/products                  7.18 kB         168 kB
├ ƒ /dashboard/products/[id]             4.39 kB         421 kB
├ ○ /dashboard/profitability             8.21 kB         376 kB
├ ○ /dashboard/settings                  4.62 kB         110 kB
├ ○ /dashboard/settings/checklist        4.46 kB         110 kB
├ ○ /dashboard/settings/competitors      4.59 kB         110 kB
├ ○ /dashboard/settings/costs            6.47 kB         167 kB
├ ○ /dashboard/settings/driver-groups    6 kB            170 kB
├ ○ /dashboard/settings/networks         540 B           373 kB
├ ○ /dashboard/settings/pricing          2.71 kB         376 kB
├ ○ /dashboard/settings/task-categories  5.26 kB        96.5 kB
├ ○ /dashboard/stores                    10.2 kB         166 kB
├ ƒ /dashboard/stores/[id]               10.9 kB         265 kB
├ ○ /dashboard/tasks                     6.63 kB         191 kB
├ ○ /dashboard/tasks/analytics           4.98 kB         206 kB
├ ○ /dashboard/treatment                 6.99 kB         168 kB
├ ○ /dashboard/upload                    147 kB          234 kB
├ ○ /dashboard/visits                    6.11 kB         409 kB
├ ○ /dashboard/visits/new                7.94 kB         165 kB
├ ○ /dashboard/work-plan                 9.7 kB          170 kB
└ ○ /login                               2.88 kB         145 kB
+ First Load JS shared by all            87.6 kB
  ├ chunks/2117-ec7078773d786e0c.js      31.9 kB
  ├ chunks/fd9d1056-c0188916255bdd5c.js  53.6 kB
  └ other shared chunks (total)          2.07 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)   server-rendered on demand
```

**סטטוס:** הבנייה עוברת בהצלחה.

---

## 5. תוכן קבצים מרכזיים

### src/app/dashboard/stores/[id]/page.tsx

```tsx
'use client';

import { useState } from 'react';
import { Receipt, Users } from 'lucide-react';
import { useStoreDetailSupabase } from '@/hooks/useStoreDetailSupabase';
import { useStoreCityComparison } from '@/hooks/useStoreCityComparison';
import { useStoreProducts } from '@/hooks/useStoreProducts';
import { LoadingState } from '@/components/common';
import {
  StoreDetailHeader,
  StoreMetricsCards,
  StoreSummaryCards,
  StoreSalesChart,
  StoreMonthlyTable,
  StoreTabs,
  TabPlaceholder,
  StoreCityComparison,
  StoreProductsTab,
} from '@/components/store-detail-supabase';
import type { StoreTabType } from '@/components/store-detail-supabase';

export default function StoreDetailPage() {
  const [activeTab, setActiveTab] = useState<StoreTabType>('overview');

  const {
    store, isLoading, error,
    selectedYear, setSelectedYear, availableYears,
    yearMonthlyData, currentYearTotals, previousYearTotals,
    chartData, goToStoresList,
  } = useStoreDetailSupabase();

  const city = useStoreCityComparison(store);
  const products = useStoreProducts(store);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingState message="טוען פרטי חנות..." />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">החנות לא נמצאה</h2>
        <p className="text-gray-600 mb-4">החנות המבוקשת לא קיימת במערכת</p>
        <button onClick={goToStoresList} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          חזרה לרשימת חנויות
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StoreDetailHeader store={store} />
      <StoreTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && (
        <>
          <StoreMetricsCards metrics={store.metrics} />
          <StoreSummaryCards
            selectedYear={selectedYear}
            currentYearTotals={currentYearTotals}
            previousYearTotals={previousYearTotals}
          />
          <StoreSalesChart data={chartData} />
          <StoreMonthlyTable
            yearMonthlyData={yearMonthlyData}
            currentYearTotals={currentYearTotals}
            selectedYear={selectedYear}
            availableYears={availableYears}
            onYearChange={setSelectedYear}
          />
          <StoreCityComparison
            store={store}
            cityStores={city.cityStores}
            rankings={city.rankings}
            cityAverages={city.cityAverages}
            isLoading={city.isLoading}
            sortKey={city.sortKey}
            sortDir={city.sortDir}
            onSort={city.handleSort}
            totalInCity={city.totalInCity}
          />
        </>
      )}

      {activeTab === 'products' && (
        <StoreProductsTab
          storeProducts={products.storeProducts}
          missingProducts={products.missingProducts}
          totalProducts={products.totalProducts}
          totalMissing={products.totalMissing}
          isLoading={products.isLoading}
          error={products.error}
          productSearch={products.productSearch}
          missingSearch={products.missingSearch}
          onProductSearchChange={products.setProductSearch}
          onMissingSearchChange={products.setMissingSearch}
        />
      )}

      {activeTab === 'pricing' && <TabPlaceholder icon={Receipt} label="מחירון" />}
      {activeTab === 'competitors' && <TabPlaceholder icon={Users} label="מתחרים" />}
    </div>
  );
}
```

### src/components/store-detail-supabase/index.ts

```ts
export { StoreDetailHeader } from './StoreDetailHeader';
export { StoreMetricsCards } from './StoreMetricsCards';
export { StoreSummaryCards } from './StoreSummaryCards';
export { StoreSalesChart } from './StoreSalesChart';
export { StoreMonthlyTable } from './StoreMonthlyTable';
export { StoreTabs, TabPlaceholder } from './StoreTabs';
export { StoreCityComparison } from './StoreCityComparison';
export { CityRankingCards } from './CityRankingCards';
export { StoreProductsTab } from './StoreProductsTab';
export type { StoreTabType } from './StoreTabs';
```

### src/hooks/useStoreDetailSupabase.ts

```ts
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DbStore, DataMetadata } from '@/types/supabase';
export const MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
export const DONUT_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

export interface StoreMonthlyRow {
  period: string;       // "202401"
  periodLabel: string;  // "ינו 24"
  year: number;
  month: number;
  gross: number;
  qty: number;
  returns: number;
  sales: number;
  returnsPct: number;
}
export interface YearlyTotals {
  year: number;
  gross: number;
  qty: number;
  returns: number;
  sales: number;
  returnsPct: number;
}
export interface StoreChartData {
  period: string;
  label: string;
  gross: number;
  qty: number;
  returns: number;
}

function getMonthLabel(period: string): string {
  const year = period.slice(2, 4);
  const month = parseInt(period.slice(4), 10);
  return `${MONTHS[month - 1]} ${year}`;
}
function calculateYearlyTotals(monthlyData: StoreMonthlyRow[], year: number): YearlyTotals {
  const yearData = monthlyData.filter(m => m.year === year);
  const totals = yearData.reduce((acc, m) => ({
    gross: acc.gross + m.gross,
    qty: acc.qty + m.qty,
    returns: acc.returns + m.returns,
    sales: acc.sales + m.sales,
  }), { gross: 0, qty: 0, returns: 0, sales: 0 });
  return {
    year,
    ...totals,
    returnsPct: totals.gross > 0 ? (totals.returns / totals.gross) * 100 : 0,
  };
}

export function useStoreDetailSupabase() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const companyId = auth.status === 'authed' ? auth.user.company_id : null;
  const storeId = params.id as string;
  const [store, setStore] = useState<DbStore | null>(null);
  const [metadata, setMetadata] = useState<DataMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  useEffect(() => {
    if (auth.status === 'loading' || !companyId) {
      setIsLoading(false); setStore(null); setMetadata(null); setError(null);
      return;
    }
    if (!storeId) return;
    async function loadStore() {
      setIsLoading(true); setError(null);
      try {
        const supabase = createClient();
        const { data: storeData, error: storeError } = await supabase
          .from('stores').select('*').eq('id', storeId).single();
        if (storeError) {
          setError('החנות לא נמצאה'); setStore(null); setIsLoading(false);
          return;
        }
        setStore(storeData);
        const { data: metaData } = await supabase
          .from('data_metadata').select('*').eq('company_id', companyId).single();
        if (metaData) {
          setMetadata(metaData);
          if (metaData.current_year) setSelectedYear(metaData.current_year);
        }
      } catch (err) {
        setError('שגיאה בטעינת נתונים');
      } finally {
        setIsLoading(false);
      }
    }
    loadStore();
  }, [auth.status, companyId, storeId]);

  const availableYears = useMemo((): number[] => {
    if (!metadata?.months_list?.length) return [2024, 2025];
    const years = new Set<number>();
    metadata.months_list.forEach(p => {
      const year = parseInt(p.slice(0, 4), 10);
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [metadata]);

  const monthlyData = useMemo((): StoreMonthlyRow[] => {
    if (!store || !metadata?.months_list?.length) return [];
    const sortedPeriods = [...metadata.months_list].sort();
    return sortedPeriods.map(period => {
      const year = parseInt(period.slice(0, 4), 10);
      const month = parseInt(period.slice(4), 10);
      const gross = store.monthly_gross?.[period] || 0;
      const qty = store.monthly_qty?.[period] || 0;
      const returns = store.monthly_returns?.[period] || 0;
      const sales = store.monthly_sales?.[period] || 0;
      return {
        period, periodLabel: getMonthLabel(period), year, month,
        gross, qty, returns, sales,
        returnsPct: gross > 0 ? (returns / gross) * 100 : 0,
      };
    });
  }, [store, metadata]);

  const yearMonthlyData = useMemo(() =>
    monthlyData.filter(m => m.year === selectedYear), [monthlyData, selectedYear]);
  const yearlyTotals = useMemo((): YearlyTotals[] =>
    availableYears.map(year => calculateYearlyTotals(monthlyData, year)), [monthlyData, availableYears]);
  const currentYearTotals = useMemo(() =>
    yearlyTotals.find(t => t.year === selectedYear) || null, [yearlyTotals, selectedYear]);
  const previousYearTotals = useMemo(() =>
    yearlyTotals.find(t => t.year === selectedYear - 1) || null, [yearlyTotals, selectedYear]);
  const chartData = useMemo((): StoreChartData[] => {
    const last12 = monthlyData.slice(-12);
    return last12.map(m => ({
      period: m.period, label: m.periodLabel, gross: m.gross, qty: m.qty, returns: m.returns,
    }));
  }, [monthlyData]);
  const goToStoresList = () => router.push('/dashboard/stores');

  return {
    storeId, store, isLoading, error, metadata, availableYears,
    selectedYear, setSelectedYear, monthlyData, yearMonthlyData, yearlyTotals,
    currentYearTotals, previousYearTotals, chartData, goToStoresList,
  };
}
```

### src/types/supabase.ts – Interfaces עיקריים

```ts
export interface DataMetadata {
  company_id: string;
  current_year: number;
  previous_year: number;
  period_start: string;
  period_end: string;
  months_list: string[];
  metrics_period_start: string;
  metrics_period_end: string;
  metrics_months: string[];
  last_upload_at: string;
  updated_at: string;
}

export interface MonthlyData {
  [period: string]: number;
}

export interface StoreMetrics {
  qty_current_year: number;
  qty_previous_year: number;
  sales_current_year: number;
  sales_previous_year: number;
  metric_12v12: number;
  metric_6v6: number;
  metric_3v3: number;
  metric_2v2: number;
  qty_12v12_current?: number;
  qty_12v12_previous?: number;
  // ... (שאר השדות)
  status_long: string;
  status_short: string;
}

export interface DbStore {
  id: string;
  company_id: string;
  external_id: number;
  name: string;
  city: string | null;
  network: string | null;
  driver: string | null;
  agent: string | null;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  monthly_gross: MonthlyData;
  monthly_returns: MonthlyData;
  metrics: StoreMetrics;
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  company_id: string;
  external_id: number;
  name: string;
  category: string | null;
  monthly_qty: MonthlyData;
  monthly_sales: MonthlyData;
  metrics: ProductMetrics;
  created_at: string;
  updated_at: string;
}
```

---

## 6. package.json – dependencies

### dependencies
```json
{
  "@supabase/ssr": "^0.8.0",
  "@supabase/supabase-js": "^2.94.0",
  "@tanstack/react-query": "^5.24.0",
  "@tanstack/react-query-devtools": "^5.24.0",
  "clsx": "^2.1.0",
  "date-fns": "^3.3.1",
  "firebase": "^10.8.0",
  "lucide-react": "^0.344.0",
  "next": "^14.2.35",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-hot-toast": "^2.4.1",
  "recharts": "^2.12.0",
  "xlsx": "^0.18.5",
  "zod": "^3.22.4"
}
```

### devDependencies
```json
{
  "@types/node": "^20.11.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@typescript-eslint/eslint-plugin": "^7.0.0",
  "@typescript-eslint/parser": "^7.0.0",
  "autoprefixer": "^10.4.17",
  "eslint": "^8.56.0",
  "eslint-config-next": "14.2.23",
  "eslint-config-prettier": "^10.1.8",
  "postcss": "^8.4.35",
  "prettier": "^3.8.1",
  "tailwindcss": "^3.4.1",
  "typescript": "^5.3.3"
}
```

---

## 7. בעיות ידועות

1. **נתוני ביקורים (visits)** – נשמרים ב-state בלבד, לא ב-Supabase. יש להוסיף טבלת `visits` אם רוצים שמירה קבועה.
2. **טבלאות מחירון/מתחרים** – הכרטיסיות "מחירון" ו"מתחרים" בדף פרטי חנות משתמשות ב-`TabPlaceholder` ולא בפונקציונליות מלאה.
3. **dataLoader (JSON)** – חלק מהמודולים עדיין משתמשים ב-JSON (useStores, useProducts, useGlobalSearch, useComparison, networkLoader וכו'). העדיפות היא להעביר הכל ל-Supabase.
4. **tsc --noEmit** – כושל ללא build קודם כי `.next/types` חסר – תקין בהתאם ל-tsconfig.
5. **Firebase** – `firebase` עדיין ב-dependencies גם שיש מעבר ל-Supabase; ייתכן שנשאר מ-auth/CompanyContext.
6. **באנר DEBUG** – בדשבורד יש באנר דיבאג עם `auth.status` ו-`company_id`; יש להסירו לפני פרודקשן.

---

## 8. שינויים עיקריים בגרסה הנוכחית (ב-Cursor)

### מיגרציה מ-JSON ל-Supabase

1. **StoresAndProductsContext** – context חדש שטוען חנויות ומוצרים מ-Supabase לפי `company_id`.
2. **VisitsContext** – עבר ל-Supabase: חנויות מ-`StoresAndProductsContext`.
3. **TreatmentContext** – `addStore` משתמש ב-`getStoreByExternalId` מ-Supabase.
4. **useTreatment** – חנויות מ-Supabase.
5. **useProfitability** – חנויות ומוצרים מ-Supabase.
6. **useWorkPlan** – חנויות מ-Supabase.
7. **useCosts** – מוצרים מ-Supabase ל-`getProductCostsWithProducts`.
8. **useDriverGroups** – חנויות מ-Supabase.
9. **AddToTreatmentModal, NetworkStoresPicker, StoreProductsExpand, DriverGroupEditModal** – שימוש בחנויות/מוצרים מ-Supabase.
10. **costsLoader** – `getProductCostsWithProducts(products)` מקבל מוצרים כפרמטר.
11. **driverGroupsLoader** – פונקציות מקבלות `stores` כפרמטר.

### עדכונים ב-Store Identity

- `calculateStoreMetrics` מקבל `storeIdentity?: { storeKey, storeMeta }`.
- בדיקת `external_id` לפני עיבוד חנויות.
- אזהרה כש-`storeIdentity` חסר.

### תקינות קוד

- תיקון type assertion ב-debug block של `excelProcessor`.
- הוספת `StoreForWorkPlan` ל-work-plan types במקום `StoreWithStatus`.

---

*דו"ח נוצר: פברואר 2026*
