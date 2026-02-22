# companyId Migration Report: DEMO_COMPANY_ID → Authenticated User

## Search Results

### 1. DEMO_COMPANY_ID constant

| File | Line | Usage |
|------|------|-------|
| `src/app/api/stores/[id]/products/route.ts` | 5 | `const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'` |
| `src/hooks/useDataUpload.ts` | 25 | `const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'` |
| `src/hooks/useStoreDetailSupabase.ts` | 12 | `const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'` |
| `src/hooks/useStoreCityComparison.ts` | 11 | `const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'` |
| `src/hooks/useSupabaseData.ts` | 8 | `const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001'` |

### 2. Hardcoded UUID `00000000-0000-0000-0000-000000000001`

Same 5 files as above (used via `DEMO_COMPANY_ID`).  
Also in `supabase-schema.sql` (test company INSERT) – leave as-is for seed data.

### 3. Hardcoded company_id filters

| File | Lines | Context |
|------|-------|---------|
| `src/app/api/stores/[id]/products/route.ts` | 48, 54 | `.eq('company_id', DEMO_COMPANY_ID)` for store_products + products |
| `src/hooks/useDataUpload.ts` | 79 | `companyId: DEMO_COMPANY_ID` in fetch body (API ignores it) |
| `src/hooks/useStoreDetailSupabase.ts` | 123 | `.eq('company_id', DEMO_COMPANY_ID)` for data_metadata |
| `src/hooks/useStoreCityComparison.ts` | 86 | `.eq('company_id', DEMO_COMPANY_ID)` for stores (city comparison) |
| `src/hooks/useSupabaseData.ts` | 40, 45, 50, 55 | `.eq('company_id', DEMO_COMPANY_ID)` for stores, products, data_metadata, filters |

---

## Files to Change (Minimal)

### Prerequisite: Auth context with `company_id`

Provide `company_id` from `public.users` for the authenticated user.

- **Option A:** New `SupabaseAuthContext` that uses `supabase.auth.getSession()`, fetches `public.users` by `user.id`, exposes `user.company_id`.
- **Option B:** Extend existing `AuthContext` to support Supabase Auth and read `company_id` from `public.users`.

### File-by-file changes

#### 1. `src/hooks/useDataUpload.ts`

**Current:**
- Line 25: `const DEMO_COMPANY_ID = ...`
- Line 79: `companyId: DEMO_COMPANY_ID` in fetch body

**Change:**
- Remove `DEMO_COMPANY_ID`
- Remove `companyId` from the fetch body (upload API already ignores it)
- No need to pass `companyId`; auth is enforced via cookies

#### 2. `src/hooks/useSupabaseData.ts`

**Current:**
- Line 8: `const DEMO_COMPANY_ID = ...`
- Lines 40, 45, 50, 55: `.eq('company_id', DEMO_COMPANY_ID)`

**Change:**
- Add `const companyId = useAuth().user?.company_id` (or `useSupabaseAuth().user?.company_id`)
- If `!companyId`, return early or loading state
- Replace all `DEMO_COMPANY_ID` with `companyId`
- Add `companyId` to `fetchData` dependency array

#### 3. `src/hooks/useStoreDetailSupabase.ts`

**Current:**
- Line 12: `const DEMO_COMPANY_ID = ...`
- Line 123: `.eq('company_id', DEMO_COMPANY_ID)` in metadata fetch

**Change:**
- Use `useAuth().user?.company_id` or receive `companyId` as a parameter
- Replace `DEMO_COMPANY_ID` with that value
- If using auth: add `companyId` to `loadStore` effect deps

#### 4. `src/hooks/useStoreCityComparison.ts`

**Current:**
- Line 11: `const DEMO_COMPANY_ID = ...`
- Line 86: `.eq('company_id', DEMO_COMPANY_ID)` when fetching city stores

**Change:**
- Use `useAuth().user?.company_id` or accept `companyId` as a parameter
- Replace `DEMO_COMPANY_ID` with that value
- If using auth: add `companyId` to the `useEffect` dependency array

#### 5. `src/app/api/stores/[id]/products/route.ts`

**Current:**
- Line 5: `const DEMO_COMPANY_ID = ...`
- Lines 48, 54: `.eq('company_id', DEMO_COMPANY_ID)` for store_products and products

**Change:**
- Use `createServerSupabaseClient()`
- Call `supabase.auth.getUser()`
- Fetch `company_id` from `public.users` where `id = user.id`
- Return 401 if not authenticated, 403 if no `company_id`
- Verify store belongs to user’s company: `store.company_id === companyId` (fetch full store or add `company_id` to select)
- Replace `DEMO_COMPANY_ID` with derived `companyId`

---

## Dependency graph

```
useSupabaseData()           → used by: useComparisonSupabase, useStoresPageSupabase, useDashboardSupabase
useStoreDetailSupabase()    → used by: dashboard/stores/[id]/page
useStoreCityComparison()    → used by: dashboard/stores/[id]/page (receives store from useStoreDetailSupabase)
useDataUpload()             → used by: dashboard/upload/page
```

---

## Recommended implementation order

1. **Auth context** – expose `user.company_id` from `public.users` for the authenticated Supabase user.
2. **API route** – `stores/[id]/products`: add auth + company lookup (same pattern as upload).
3. **useSupabaseData** – switch to `companyId` from auth; this fixes comparison, stores page, and dashboard.
4. **useStoreDetailSupabase** – switch to auth `companyId`.
5. **useStoreCityComparison** – switch to auth `companyId`.
6. **useDataUpload** – remove `companyId` from the fetch body.

---

## Files NOT to change

- `src/lib/supabase/queries.ts` – already takes `companyId` as argument; callers should pass it from auth.
- `src/app/api/upload/route.ts` – already derives `companyId` from auth.
- `supabase-schema.sql` – seed company ID should remain as-is.
