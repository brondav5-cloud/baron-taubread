# Supabase Client Creation & Auth – Audit & Proposal

## 1. Search Results: Browser-Side Supabase Usage

### `createClient(` usage

| File | Function/Location | Notes |
|------|-------------------|-------|
| `src/lib/supabase/client.ts` | `createClient()` (exported) | Uses `createBrowserClient` from `@supabase/ssr` ✓ |
| `src/lib/supabase/client.ts` | `getSupabaseClient()` | Returns singleton from `createClient()` |
| `src/lib/supabase/queries.ts` | Multiple functions | `import createClient from './client'` – 14 call sites |
| `src/hooks/useStoreDetailSupabase.ts` | `loadStore()` | `createClient()` from `@/lib/supabase/client` |
| `src/hooks/useStoreCityComparison.ts` | `fetchData()` | `createClient()` from `@/lib/supabase/client` |
| `src/hooks/useSupabaseData.ts` | `fetchData()` | `createClient()` from `@/lib/supabase/client` |
| `src/hooks/useExcelUpload.ts` | `uploadToSupabase()` | `getSupabaseClient()` from `@/lib/supabase/client` |

### `new SupabaseClient` – none found in `src/`

### `@supabase/supabase-js` imports

| File | Usage | Server/Browser |
|------|-------|----------------|
| `src/app/api/upload/route.ts` | `createClient` for service role | Server (API route) |
| `src/app/api/stores/[id]/products/route.ts` | `createClient` for service role | Server (API route) |

### `supabase.auth.signInWithPassword` – none found

Auth is still Firebase-based. No Supabase sign-in in the client.

### Client-side auth-related flow

- **Browser client**: `src/lib/supabase/client.ts` → `createBrowserClient` from `@supabase/ssr`
- **Server session read**: `src/app/api/whoami/route.ts` → `createServerSupabaseClient()` → `supabase.auth.getUser()`
- **Server client**: `src/lib/supabase/server.ts` → `createServerClient` with `cookies()` from Next.js

---

## 2. Current `client.ts` Implementation

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

`createBrowserClient` from `@supabase/ssr`:

- Uses cookie storage by default when `cookies` is not passed (via `document.cookie`)
- Sets `flowType: "pkce"`, `persistSession: true`
- Stores auth session in cookies that are sent with requests

So in principle, sessions are already cookie-based and readable by the server.

---

## 3. Minimal Change – Ensure Cookies for Server Access

To make cookie usage explicit and align with Supabase’s recommended SSR setup, use the optional `cookieOptions` so both browser and server clients share the same cookie name and behavior.

### Proposed change: `src/lib/supabase/client.ts`

**Current:**
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Proposed (minimal, explicit cookie config):**
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: '/',
      },
    }
  );
}
```

This keeps defaults while making cookie behavior explicit. If `createServerSupabaseClient` uses different cookie options, they must match (same path, domain, etc.).

### Alternative: align with server client

If `server.ts` uses custom cookie options, mirror them in the browser client:

```typescript
// client.ts – match server cookie config
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-auth-token',  // if server uses custom name
        path: '/',
      },
    }
  );
}
```

`@supabase/ssr` uses internal defaults when `cookieOptions` is omitted; both clients come from the same package, so names usually match.

---

## 4. Verification

1. **Browser auth flow (when Supabase Auth is used):**
   - `supabase.auth.signInWithPassword()` → session written to cookies by `createBrowserClient`
   - Cookies sent on subsequent requests

2. **Server route:**
   - `createServerSupabaseClient()` reads `cookies()` from the request
   - `supabase.auth.getUser()` uses those cookies
   - If `getUser()` returns a user, cookies are working

3. **Environment:**
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
   - Same Supabase project for client and server

---

## 5. Summary

| Item | Status |
|------|--------|
| Browser client uses `createBrowserClient` from `@supabase/ssr` | ✓ |
| Sessions stored in cookies by default | ✓ |
| Server reads session from cookies | ✓ (via `createServerSupabaseClient`) |
| API routes (upload, stores/products) | Use service role; no change needed |

**Minimal change:** Add `cookieOptions: { path: '/' }` to the browser client if you want an explicit, minimal cookie configuration. If auth works end-to-end, the current setup is already sufficient.
