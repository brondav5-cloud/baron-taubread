# Firebase Auth → Supabase Auth Migration

## 1. Firebase Auth Usage Inventory

### Files Using Firebase Auth (direct imports and calls)

| File | Firebase Usage | Purpose |
|------|----------------|---------|
| **`src/services/firebase/auth.ts`** | `firebase/auth`: `signInWithEmailAndPassword`, `signOut`, `sendPasswordResetEmail`, `onAuthStateChanged`, `FirebaseUser` | Auth service: sign in, sign out, password reset, auth state listener |
| | `firebase/firestore`: `doc`, `getDoc`, `updateDoc`, `serverTimestamp` | User profile: `getUserData(userId)` reads from Firestore `users/{userId}`, `updateUserData` writes, `signIn` updates lastLogin |
| **`src/services/firebase/config.ts`** | `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage` | Firebase init, exports `auth`, `db`, `storage` |
| **`src/context/AuthContext.tsx`** | `FirebaseUser` from `firebase/auth` | Type for `firebaseUser` state |
| | `subscribeToAuthState`, `signIn`, `signOut`, `resetPassword`, `getUserData` from `@/services/firebase/auth` | Auth state sync, sign in/out, reset password, fetch user profile |
| **`src/context/CompanyContext.tsx`** | `collection`, `getDocs`, `doc`, `getDoc` from `firebase/firestore` | Fetches companies from Firestore (super_admin: all; others: single company by `user.company_id`) |
| | `db` from `@/services/firebase/config` | Firestore instance |
| **`src/app/login/page.tsx`** | None (demo mode) | Login form; currently uses fake `setTimeout` – **does not call Firebase** |
| **`src/services/firebase/stores.ts`** | `firebase/firestore` (collection, getDocs, etc.) | Firestore CRUD for stores – **not Auth, separate domain** |
| **`src/lib/constants.ts`** | `FIREBASE_ERROR_MESSAGES` | Error code → Hebrew message map for Firebase Auth errors |
| **`src/types/externals.d.ts`** | `declare module 'firebase/auth'`, `'firebase/firestore'`, `'firebase/storage'` | TypeScript module declarations |
| **`src/lib/pricingLoader.ts`** | Comment only | "For PRODUCTION: will use Firebase" – no code |
| **`src/hooks/useSettings.ts`** | Comment only | "In production, this would save to Firebase/API" – no code |

### Auth-specific dependency chain

```
AuthContext
  └── services/firebase/auth (signIn, signOut, resetPassword, subscribeToAuthState, getUserData)
        └── firebase/auth (signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail)
        └── firebase/firestore (getDoc, updateDoc on users collection)
        └── services/firebase/config (auth, db)

CompanyContext
  └── firebase/firestore (companies collection)
  └── useAuth (for user, company_id)
```

### Exports from auth.ts not used elsewhere

- `updateUserData` – not imported anywhere
- `getCurrentUser` – not imported anywhere
- `getCurrentFirebaseUser` – not imported anywhere

---

## 2. Minimal Changes to Replace Firebase Auth with Supabase Auth

**Scope:** Replace only Firebase Auth + Firestore user profile with Supabase Auth + `public.users`.  
**Out of scope:** CompanyContext (Firestore companies) and firebase/stores.ts – leave as-is or migrate separately.

---

### Change 1: Create `src/services/supabase/auth.ts`

New file implementing the same interface as the auth part of `firebase/auth.ts`:

```typescript
// Supabase Auth – drop-in replacement for Firebase Auth part
import { createClient } from '@/lib/supabase/client';
import type { User, ApiResponse } from '@/types';

export function subscribeToAuthState(callback: (user: { id: string } | null) => void) {
  const supabase = createClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<ApiResponse<User>> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { success: false, error: mapSupabaseError(error.message) };
  }
  const userData = await getUserData(data.user.id);
  if (!userData) return { success: false, error: 'משתמש לא נמצא במערכת' };
  return { success: true, data: userData };
}

export async function signOut(): Promise<ApiResponse<void>> {
  const supabase = createClient();
  await supabase.auth.signOut();
  return { success: true };
}

export async function resetPassword(email: string): Promise<ApiResponse<void>> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { success: false, error: mapSupabaseError(error.message) };
  return { success: true, message: 'נשלח אימייל לאיפוס סיסמה' };
}

export async function getUserData(userId: string): Promise<User | null> {
  const supabase = createClient();
  const { data } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role ?? 'viewer',
    company_id: data.company_id ?? '',
    isActive: true,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapSupabaseError(msg: string): string {
  if (msg.includes('Invalid login')) return 'פרטי ההתחברות שגויים';
  if (msg.includes('Email not confirmed')) return 'נא לאשר את האימייל';
  return msg || 'אירעה שגיאה, נסה שוב';
}
```

---

### Change 2: Update `src/context/AuthContext.tsx`

- Replace `import { type User as FirebaseUser } from 'firebase/auth'` → remove (or use a local type).
- Replace `import { ... } from '@/services/firebase/auth'` → `import { ... } from '@/services/supabase/auth'`.
- Replace `FirebaseUser` with `{ id: string }` or a minimal type (only `id` is used).
- In `subscribeToAuthState` callback: `fbUser.uid` → `fbUser.id` (Supabase uses `id`).
- Remove `firebaseUser` state if only used for presence; otherwise keep a minimal `{ id: string } | null`.

---

### Change 3: Update `src/app/login/page.tsx`

- Import `useAuth` from AuthContext.
- Replace demo `setTimeout` with `auth.signIn(email, password)`.
- Wire "שכחתי סיסמה" to `auth.resetPassword(email)`.

---

### Change 4: `src/services/firebase/auth.ts` – Deprecate or Remove

- Option A: Delete and ensure all imports use `@/services/supabase/auth`.
- Option B: Re-export from supabase/auth for backwards compatibility:
  ```typescript
  export * from '@/services/supabase/auth';
  ```

---

### Change 5: Keep CompanyContext on Firestore (minimal scope)

- CompanyContext uses Firestore `companies` collection.
- For minimal Auth-only migration: **leave CompanyContext unchanged**.
- Prerequisite: `user.company_id` from Supabase `public.users` (via `getUserData`) must match Firestore company IDs if you still use Firestore for companies.
- Alternative: Migrate companies to Supabase later and switch CompanyContext to Supabase.

---

### Change 6: `FIREBASE_ERROR_MESSAGES` (optional)

- `lib/constants.ts`: Keep `FIREBASE_ERROR_MESSAGES` for any remaining Firebase use, or add `SUPABASE_AUTH_ERROR_MESSAGES` and use it in the new auth service.
- New Supabase auth service can map `error.message` directly instead of using these constants.

---

### Change 7: Types

- `User` from `@/types` stays (id, email, name, role, company_id, etc.).
- Ensure Supabase `public.users` columns align with this (id, email, name, role, company_id, created_at, updated_at).

---

## 3. Files to Create/Modify Summary

| Action | File |
|--------|------|
| **Create** | `src/services/supabase/auth.ts` |
| **Modify** | `src/context/AuthContext.tsx` – switch import to supabase/auth, `uid` → `id` |
| **Modify** | `src/app/login/page.tsx` – use `useAuth().signIn`, `resetPassword` |
| **Modify** | `src/services/firebase/auth.ts` – delete or re-export from supabase |
| **No change** | `CompanyContext.tsx`, `firebase/stores.ts`, `firebase/config.ts` (until Firestore migration) |
| **Optional** | `lib/constants.ts` – add Supabase error map if desired |

---

## 4. Prerequisites

1. Supabase project with `public.users` table and RLS configured.
2. Users migrated from Firestore `users` to Supabase `public.users` (or create test user manually).
3. `.env`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` set.
4. Supabase Auth: email provider enabled.

---

## 5. What Stays on Firebase (out of Auth scope)

- `firebase/config.ts` – still needed if CompanyContext or stores use Firestore
- `firebase/stores.ts` – Firestore stores CRUD
- `CompanyContext` – Firestore companies
- `externals.d.ts` – can stay for Firestore types until Firestore is fully removed
