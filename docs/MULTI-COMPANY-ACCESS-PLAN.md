# Multi-Company Access: Design & Rollout Plan

**Document type:** Planning only — no code changes, migrations, or refactoring  
**Date:** 2026-02-22

---

## 1. Current-State Assessment

### 1.1 Single-Company Assumptions: Summary

| Location | Assumption | File + Line |
|----------|------------|-------------|
| **DB: users table** | `company_id UUID NOT NULL` — one company per user | `supabase-schema.sql:30`, migrations |
| **DB: get_my_company_id()** | Returns single `company_id` from `users` | `supabase/migrations/20260220_04_remind_at_and_users.sql:31`, `20260222_01_production_hardening.sql:9-12` |
| **DB: RLS policies** | `company_id = get_my_company_id()` or `company_id IN (SELECT company_id FROM users WHERE id = auth.uid())` | `supabase/migrations/20260221_03_production_readiness.sql:29-106`, `20260221_01_store_deliveries.sql:48-115`, `20260222_01_production_hardening.sql:17-25` |
| **API: /api/whoami** | Returns single `companyId`; fails if no `company_id` | `src/app/api/whoami/route.ts:15-34` |
| **API: /api/upload** | Derives `companyId` from `userRow.company_id` (correct — server-side) | `src/app/api/upload/route.ts:83-102` |
| **API: /api/upload-deliveries** | Same pattern | `src/app/api/upload-deliveries/route.ts:77-91` |
| **API: /api/users** | Inserts new users with `me.company_id` | `src/app/api/users/route.ts:50-113` |
| **API: /api/stores/[id]/products** | Validates store belongs to `userRow.company_id` | `src/app/api/stores/[id]/products/route.ts:37-72` |
| **Client: useAuth (hooks)** | Returns `auth.user.company_id` (single) from whoami | `src/hooks/useAuth.ts:41-45` |
| **Client: CompanyContext** | Uses `user.company_id` from AuthContext (Firebase); fetches 1 company for non-super_admin | `src/context/CompanyContext.tsx:83-97` |
| **Client: 20+ hooks/contexts** | Pass `auth.user.company_id` into Supabase queries | `useSupabaseData.ts:27`, `useStoreDetailSupabase.ts:110`, `useProductsPageSupabase.ts:66`, etc. |
| **Middleware** | No company check; only auth | `middleware.ts:31-40` |
| **DB: users trigger** | Prevents non-admins from changing `company_id` | `supabase/migrations/20260222_01_production_hardening.sql:32-58` |

### 1.2 Critical Points by Category

**DB Schema**
- `public.users` — `company_id UUID NOT NULL` (single)
- `get_my_company_id()` — returns one company
- All RLS policies assume one company per user

**API**
- `/api/whoami` — shape `{ companyId, ... }` (single)
- Upload routes — correctly use server-derived `company_id` ✅
- `/api/users` — assigns new users to `me.company_id` only

**Client**
- `useAuth` (hooks) — `auth.user.company_id` single
- CompanyContext — Firebase-based; `getCompanyPath` for Firestore (legacy)
- Data hooks — all filter by `auth.user.company_id`

**Auth split**
- Login: Supabase (`supabase.auth.signInWithPassword`)
- AuthProvider/CompanyContext: Firebase (`subscribeToAuthState`, Firestore)
- Data hooks: Supabase (`/api/whoami` → `hooks/useAuth`)
- There is a dual auth path; Supabase path is primary for dashboard data.

---

## 2. Target Outcome (Multi-Company)

### 2.1 Design Goals

- User belongs to **1..N companies**
- Per-membership role: `admin`, `editor`, `viewer`
- **Selected company** context (server-authoritative)
- Users with 1 company skip company picker
- Client cannot spoof `company_id`; server enforces membership
- No cross-company reads/writes

### 2.2 Proposed Architecture

#### 2.2.1 New Table: `user_companies`

```sql
CREATE TABLE user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX idx_user_companies_user ON user_companies(user_id);
CREATE INDEX idx_user_companies_company ON user_companies(company_id);
```

#### 2.2.2 Selected Company Context (Server-Side)

**Option A: JWT custom claim (recommended)**  
- On login or company switch: set `app_metadata.selected_company_id` via `auth.admin.updateUserById()`
- API reads `auth.jwt()->>'selected_company_id'` or falls back to first membership
- Supabase supports custom claims via `app_metadata` (limited; may require Edge Functions or backend)

**Option B: Encrypted HTTP-only cookie**
- Endpoint `POST /api/select-company` sets `selected_company_id` cookie (encrypted, HttpOnly, SameSite)
- API reads cookie, validates membership, uses as context
- Simpler; no JWT changes

**Option C: Database row**
- `user_sessions` or extend `users` with `selected_company_id` (nullable)
- Requires migration; selected company stored in DB
- Works well with server-side reads

**Recommendation:** Start with **Option B (cookie)** for simplicity; migrate to JWT claim later if needed.

#### 2.2.3 Helper Functions

```sql
-- Returns companies the user is a member of
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF uuid AS $$
  SELECT company_id FROM user_companies WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Returns selected company (from cookie/session), validated against membership
-- Or: first company if only one, else NULL (must select)
-- Implementation depends on chosen Option A/B/C.
```

#### 2.2.4 API Changes

| Endpoint | Change |
|----------|--------|
| `GET /api/whoami` | Return `companies: [{ id, name, slug, role }]`, `selectedCompanyId`, `selectedCompanyRole`; validate selected company is in memberships |
| `POST /api/select-company` | New. Body `{ companyId }`. Validate membership, set cookie/session, return 200 |
| `POST /api/upload` | Use `get_selected_company_id()` (or cookie) instead of `users.company_id` |
| `POST /api/upload-deliveries` | Same |
| `POST /api/users` | Use selected company; new users get `company_id` from selected context |
| `GET /api/stores/[id]/products` | Validate store against selected company |

#### 2.2.5 Backward Compatibility During Migration

- Keep `users.company_id` as **default/primary company** during transition
- `get_selected_company_id()` = selected (cookie/JWT) if valid, else `users.company_id`
- After full migration, deprecate `users.company_id` for membership (keep only for legacy/default)

---

## 3. Security & Data Isolation Plan

### 3.1 RLS Strategy

**Pattern:** Replace single-company functions with membership checks.

```sql
-- Old
company_id = get_my_company_id()

-- New
company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
```

**New helper:**
```sql
CREATE OR REPLACE FUNCTION user_can_access_company(p_company_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = auth.uid() AND company_id = p_company_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

**Per-table pattern:**
- `USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))`
- `WITH CHECK (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))`

**Role-aware policies (optional):**  
For write policies, join `user_companies` and check `role IN ('admin','editor')` where needed.

### 3.2 Tables Requiring RLS Updates

All company-scoped tables must switch from `get_my_company_id()` to `user_companies`:

| Table | Current RLS | Action |
|-------|-------------|--------|
| companies | `id = get_my_company_id()` | `id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())` |
| data_metadata | `company_id = get_my_company_id()` | Use `user_companies` |
| stores, products, store_products | Same | Same |
| filters, uploads, snapshots | Same | Same |
| store_deliveries, delivery_uploads | `company_id IN (SELECT company_id FROM users...)` | Switch to `user_companies` |
| visits, store_treatments, store_treatment_history | Same | Same |
| work_plan_items | Same | Same |
| product_costs, driver_groups, individual_drivers | Same | Same |
| product_developments, development_stage_templates, product_stages, product_history | Same | Same |
| task_categories | Same | Same |
| fault_types, fault_statuses, faults | Same | Same |
| tasks, workflows | Same | Same |

### 3.3 Server-Side Validation Strategy

1. **Every API route** that writes data:
   - Resolve company from server (cookie/JWT + membership check), never from body/query.
   - Validate: `user_can_access_company(resolved_company_id)` before any write.

2. **Upload routes:**
   - Already derive `companyId` from `users`; change to derive from selected-company context + membership check.

3. **Stores [id] products:**
   - Already validates `store.company_id === userCompanyId`; change to `store.company_id === selectedCompanyId` and verify membership.

### 3.4 Highest-Risk Areas

| Risk | Location | Mitigation |
|------|----------|------------|
| **Client spoofs company_id** | Upload payload, query params | Never trust client; always use server-resolved selected company + membership |
| **RLS bypass via service_role** | API routes using `createClient(..., SERVICE_KEY)` | Service role bypasses RLS; ensure all writes use validated company_id before calling Supabase |
| **Cookie tampering** | `selected_company_id` cookie | Encrypt + sign cookie; verify membership on every read |
| **Race on company switch** | Multiple tabs | Consider short TTL or nonce; or accept eventual consistency |
| **Super_admin** | Cross-tenant access | Keep super_admin logic separate; use `user_companies` for normal users only |

---

## 4. Migration & Rollout Plan

### Phase 0: Prerequisites

- [ ] Full DB backup (Supabase dashboard or `pg_dump`)
- [ ] Staging environment with copy of prod data
- [ ] Test users: 1 single-company, 1 multi-company
- [ ] Feature flag: `MULTI_COMPANY_ENABLED` (env var)

**Rollback:** Restore from backup if needed.

---

### Phase 1: DB Additions (Non-Breaking)

1. Create `user_companies` table.
2. Backfill: `INSERT INTO user_companies (user_id, company_id, role) SELECT id, company_id, role FROM users;`
3. Add indexes.
4. Do **not** drop `users.company_id` yet.
5. Add `get_user_company_ids()` and `user_can_access_company(uuid)`.
6. Deploy DB migrations; verify backfill row counts.

**Rollback:** Drop `user_companies`; remove new functions. Existing RLS unchanged.

---

### Phase 2: Dual-Write (Optional Safety Period)

- New user creation: insert into both `users` and `user_companies`.
- User updates: keep `users.company_id` in sync with "primary" membership if desired.
- No RLS changes yet; `get_my_company_id()` still used.

**Rollback:** Stop dual-write; no schema revert needed.

---

### Phase 3: API Updates

1. **Implement selected-company context:**
   - Add `POST /api/select-company` (sets cookie).
   - Add server util: `getSelectedCompanyId(request)` → validates cookie + membership.
2. **Update `GET /api/whoami`:**
   - Query `user_companies` for memberships.
   - Return `companies`, `selectedCompanyId` (from cookie or first if only one), `selectedCompanyRole`.
   - Fallback: if no cookie, use `users.company_id` if in memberships.
3. **Update upload, upload-deliveries, users, stores/[id]/products:**
   - Use `getSelectedCompanyId(request)` instead of `users.company_id`.
   - Validate membership before any write.

**Rollback:** Revert API to use `users.company_id`; remove select-company endpoint.

---

### Phase 4: RLS Migration

1. Update `get_my_company_id()` to return selected company (from session/cookie) when possible — **or** introduce `get_effective_company_id()` used only by RLS.
2. **Alternative (simpler):** Change all RLS policies to use `user_companies`:
   - `company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())`
3. RLS cannot read HTTP cookies; selected company must come from:
   - JWT custom claim, or
   - DB column (e.g. `users.selected_company_id` updated by API).

**Recommended:** Add `users.selected_company_id` (nullable). API sets it when user selects company. RLS uses:
```sql
COALESCE(
  (SELECT selected_company_id FROM users WHERE id = auth.uid()),
  (SELECT company_id FROM users WHERE id = auth.uid())
) IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
```
Actually: RLS should allow access if `company_id` is in user's memberships. Selected company is for **which** data to show, not for **which** data is allowed. So:

- **RLS:** `company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())` — allows all user's companies.
- **Application:** Filters/queries by selected company. So client and API only request data for selected company.

This keeps RLS simple: membership check only. Selected company is app-level filter.

**Rollback:** Restore previous RLS policies (using `get_my_company_id()`).

---

### Phase 5: UI Updates

1. Update `useAuth` / whoami consumer to handle `companies`, `selectedCompanyId`, `selectedCompanyRole`.
2. Add company picker (header/sidebar) when `companies.length > 1`.
3. On switch: call `POST /api/select-company`, then refetch whoami and invalidate data.
4. Auto-select when `companies.length === 1`; skip picker.
5. Migrate CompanyContext from Firebase to Supabase/whoami if still on Firebase.

**Rollback:** Revert UI to single-company display; keep backend changes if safe.

---

### Phase 6: Remove Old Single-Company Fields (After Verification)

1. Make `users.company_id` nullable or remove.
2. Update any remaining references.
3. Drop deprecated helpers if unused.

**Rollback:** Re-add column; backfill from `user_companies` (primary membership).

---

## 5. Verification Plan

### 5.1 Test Cases

| # | Scenario | Expected |
|---|----------|----------|
| 1 | User with 1 company logs in | No picker; sees that company automatically |
| 2 | User with N companies logs in | Sees picker; can switch; data refreshes per company |
| 3 | User requests Company B data while selected is A | API returns 403 or empty (no B data) |
| 4 | Client sends `companyId: <other>` in upload body | Server ignores; uses selected company |
| 5 | Direct Supabase client query with `.eq('company_id', otherCompanyId)` | RLS blocks; no rows returned |
| 6 | New user added to Company A | Appears in A only; cannot see B |
| 7 | User removed from Company B | Immediately loses access to B |
| 8 | Regression: existing single-company user | Behavior unchanged; no picker |

### 5.2 Security Checklist

- [ ] No API accepts `company_id` from request body for authorization
- [ ] All uploads write to server-resolved selected company
- [ ] RLS policies use `user_companies` for all company-scoped tables
- [ ] Cookie/session for selected company is signed and validated

---

## 6. Deliverables Summary

### Proposed Architecture

- **Tables:** `user_companies` (user_id, company_id, role)
- **APIs:** `GET /api/whoami` (companies + selected), `POST /api/select-company`
- **RLS:** `company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())`
- **Selected company:** Cookie or `users.selected_company_id`; server-authoritative

### Rollout Phases

| Phase | Scope | Rollback |
|-------|-------|----------|
| 0 | Backups, staging, test users | Restore backup |
| 1 | Add `user_companies`, backfill | Drop table + functions |
| 2 | Dual-write (optional) | Stop dual-write |
| 3 | API: whoami, select-company, use selected in all routes | Revert API |
| 4 | RLS to `user_companies` | Revert RLS |
| 5 | UI: company picker, skip for single-company | Revert UI |
| 6 | Remove `users.company_id` | Re-add column |

### Risk List

| Priority | Risk | Mitigation |
|----------|------|------------|
| **P0** | Cross-company data leak | RLS + server validation on every route |
| **P0** | Client spoofs company | Never trust client `company_id` |
| **P1** | RLS migration breaks existing access | Test on staging; phased rollout |
| **P1** | Cookie/session reliability | Encrypt, validate membership on each use |
| **P2** | Firebase vs Supabase auth split | Resolve; migrate CompanyContext to Supabase |

### Open Questions

1. **Auth consolidation:** CompanyContext uses Firebase; data uses Supabase. Should CompanyContext be migrated to use whoami/Supabase?
2. **Super_admin:** Should super_admin continue to bypass company checks, or use same `user_companies` with special rows?
3. **Selected company persistence:** Prefer cookie (stateless) or `users.selected_company_id` (DB)?
4. **Role scope:** Is role per-company (e.g. admin in A, viewer in B) required from day one? Current design supports it via `user_companies.role`.

---

*End of planning document.*

---

## Implementation Log (2026-02-22)

**Phases completed:**
- Phase 1: `user_companies` table + backfill → `supabase/migrations/20260223_01_user_companies_multi_company.sql`
- Phase 4: RLS to `user_companies` → `supabase/migrations/20260223_02_rls_user_companies.sql`
- Phase 3: API whoami, select-company, cookie util, route updates
- Phase 5: SupabaseAuthContext, useAuth, CompanyPicker, DashboardLayout company-selection screen

**Key files changed:**
- `src/lib/api/selectedCompany.ts` - cookie + resolveSelectedCompanyId
- `src/app/api/whoami/route.ts` - companies[], selectedCompanyId
- `src/app/api/select-company/route.ts` - new
- `src/context/SupabaseAuthContext.tsx` - new
- `src/hooks/useAuth.ts` - uses context
- `src/components/layout/CompanyPicker.tsx` - new
- `src/components/layout/DashboardLayout.tsx` - company selection screen
