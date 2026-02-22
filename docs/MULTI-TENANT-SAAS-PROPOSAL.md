# Multi-Tenant SaaS Architecture Proposal

## Summary

Convert from single-tenant (Firebase + Supabase with broken RLS) to multi-tenant SaaS with **strict tenant isolation** using Supabase Auth + RLS.

---

## 1. Auth Architecture

### Use Supabase Auth Only

| Before (Firebase) | After (Supabase) |
|------------------|-----------------|
| `signInWithEmailAndPassword` | `supabase.auth.signInWithPassword` |
| `onAuthStateChanged` | `supabase.auth.onAuthStateChange` |
| User data in Firestore | User data in `public.users` (company_id, role) |
| No JWT to Supabase | JWT with `sub` = user id → `auth.uid()` works |

### Flow

1. **Login**: `supabase.auth.signInWithPassword({ email, password })`
2. **Session**: Stored in cookies (Supabase SSR) → JWT sent with every request
3. **User profile**: `public.users` row with `id = auth.uid()`, `company_id`, `role`
4. **RLS**: `get_user_company_id()` = `SELECT company_id FROM users WHERE id = auth.uid()`

---

## 2. Database Structure

### Already Correct

All data tables have `company_id`:

- `stores`, `products`, `store_products`, `data_metadata`, `filters`, `uploads`, `snapshots`
- `users` has `company_id` (FK to companies)

### Changes Required

**2.1 Add `super_admin` to users.role**

```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer'));
```

**2.2 Handle users without company (signup flow)**

New users sign up → no row in `public.users` yet → `get_user_company_id()` returns NULL → RLS blocks all data. Correct.

After onboarding (create company), insert into `public.users` with `company_id`.

**2.3 Optional: `super_admin` for cross-tenant**

If you need a platform admin who sees all tenants:

```sql
-- get_user_company_id returns NULL for super_admin viewing "as" a tenant
-- More complex: use request JWT claim for impersonation
-- For now: skip. Super admin can use service_role in admin tools only.
```

Keep it simple: every user has exactly one `company_id`. No cross-tenant access.

---

## 3. RLS Policies

### Principle: Strict Tenant Isolation

All access: `company_id = get_user_company_id()`

### Policy Pattern (per table)

```sql
-- READ: Users see only their company's data
CREATE POLICY "tenant_select" ON <table>
  FOR SELECT USING (company_id = get_user_company_id());

-- WRITE: Users can only insert/update/delete their company's data
CREATE POLICY "tenant_write" ON <table>
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
```

### Current Schema Fix

Your schema uses separate "view" vs "manage" policies. Simplification:

| Table | SELECT | INSERT/UPDATE/DELETE |
|-------|--------|----------------------|
| companies | Own only | N/A (admin creates) |
| users | Own profile | N/A (admin/invite) |
| stores, products, store_products, data_metadata, filters, uploads, snapshots | `company_id = get_user_company_id()` | Same |

**Important**: `WITH CHECK` for INSERT ensures the `company_id` in the new row matches the user's company. Add it where missing:

```sql
-- Example: stores
DROP POLICY IF EXISTS "Users can view own company stores" ON stores;
DROP POLICY IF EXISTS "Admins can manage stores" ON stores;

CREATE POLICY "stores_tenant" ON stores
  FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
```

Repeat for: products, store_products, data_metadata, filters, uploads, snapshots.

### Companies Table

Users can only SELECT their own company:

```sql
CREATE POLICY "companies_tenant" ON companies
  FOR SELECT USING (id = get_user_company_id());
```

Company creation: via API route or backend only (signup onboarding).

---

## 4. API Routes – Security Critical

### Current Bug

Upload API accepts `companyId` from request body. **Any user could send another tenant's companyId and overwrite their data.**

### Fix: Derive company_id from authenticated user

```typescript
// In every API route that touches tenant data:
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  const supabase = createServerClient(...); // with cookies from request
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!userRow?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 });

  const companyId = userRow.company_id;
  // NEVER use companyId from request body for authorization
}
```

### Affected Routes

- `POST /api/upload` – use `companyId` from session, not payload
- `GET /api/stores/[id]/products` – already filters by store; ensure store belongs to user's company (or rely on RLS if using anon client with session)

---

## 5. Client-Side: Supabase Session

### Current

`createBrowserClient` with anon key. No session = no `auth.uid()` = RLS blocks everything (or returns empty).

### After Migration

Same `createBrowserClient` from `@supabase/ssr`. After `signInWithPassword`, Supabase stores session in cookies. All subsequent `supabase.from('...').select()` automatically include the JWT. RLS sees `auth.uid()` and allows access.

No code change to the client creation – only the auth calls switch from Firebase to Supabase.

---

## 6. Migration Path: Firebase → Supabase Auth

### Phase 1: Prepare Supabase (no breaking changes)

1. Run schema changes (role CHECK, optional policy refinements).
2. Ensure RLS is enabled and policies are correct.
3. Create a Supabase auth user for each existing Firebase user (see script below).

### Phase 2: Migrate Users

Export from Firestore:
- `id` (Firebase UID – used only for mapping)
- `email`, `name`, `role`, `company_id`

For each user:

```javascript
// Use Supabase Admin API (service_role)
const { data: authUser } = await supabase.auth.admin.createUser({
  email,
  email_confirm: true,
  password: generateTempPassword(), // or send magic link
  user_metadata: { migrated_from_firebase: true }
});

await supabase.from('users').insert({
  id: authUser.user.id,  // Supabase UUID, NOT Firebase UID
  company_id,
  email,
  name,
  role
});

// Send password reset email
await supabase.auth.resetPasswordForEmail(email);
```

Firebase UID ≠ Supabase auth user id. Migration creates new auth users. Map by email.

### Phase 3: Switch Auth in Frontend

1. Replace `AuthContext`:
   - Use `supabase.auth.getSession()` / `onAuthStateChange`
   - Fetch user from `public.users` via `supabase.from('users').select().eq('id', session.user.id).single()`
2. Replace `signIn` → `supabase.auth.signInWithPassword`
3. Replace `signOut` → `supabase.auth.signOut`
4. Remove Firebase auth and Firestore user reads.
5. Remove `getUserData` from Firestore – read from `public.users` instead.

### Phase 4: Cleanup

- Remove Firebase Auth dependency (or keep only if used elsewhere).
- Remove Firestore user collection reads.
- Update `useDataUpload` to get `companyId` from auth context (user.company_id) and send in body; API must still validate and override with DB lookup.

---

## 7. New Tenant Signup Flow

1. User clicks "Sign up" on landing page.
2. `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`
3. Email confirmation (optional; can disable in Supabase dashboard for faster onboarding).
4. After first login, check `public.users` for row with `id = auth.uid()`.
5. If none → redirect to `/onboarding`.
6. Onboarding: "Create your bakery" form → company name.
7. API route or Supabase function:
   - Insert into `companies`
   - Insert into `users` (id = auth.uid(), company_id = new_company.id, role = 'admin')
8. Redirect to dashboard.

---

## 8. File Checklist

| Task | File(s) |
|------|---------|
| Schema: role CHECK | `supabase-schema.sql` |
| Schema: RLS WITH CHECK | Migration SQL |
| Auth context → Supabase | `context/AuthContext.tsx` |
| Auth service → Supabase | New `services/supabase/auth.ts` or replace `firebase/auth` |
| Login page | `app/login/page.tsx` |
| Upload API: auth + companyId | `api/upload/route.ts` |
| Store products API: auth | `api/stores/[id]/products/route.ts` |
| useDataUpload: companyId from context | `hooks/useDataUpload.ts` |
| Hooks: companyId from user | `useSupabaseData`, `useStoreProducts`, etc. |
| Onboarding page | New `app/onboarding/page.tsx` |
| Migration script | New `scripts/migrate-firebase-users.ts` |

---

## 9. Minimal Implementation Order

1. **Schema** – role CHECK, RLS WITH CHECK.
2. **Auth** – Replace Firebase with Supabase in AuthContext and login.
3. **API** – Add auth + company lookup to upload and stores routes.
4. **Hooks** – Use `companyId` from auth context instead of hardcoded DEMO_COMPANY_ID.
5. **Onboarding** – New tenant signup flow.
6. **Migration** – Script + one-time run for existing users.

---

## 10. What to Avoid

- Custom JWT claims for company_id – use `public.users` and `get_user_company_id()`.
- Dual auth (Firebase + Supabase) – pick one.
- Trusting `companyId` from client in any API.
- Complex role-based RLS – tenant isolation is enough; role checks in app layer.
