/**
 * Selected company context - cookie-based, server validates membership
 * Cookie stores company_id; server verifies via user_companies before trusting
 */
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

const COOKIE_NAME = "bakery-selected-company";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function getSelectedCompanyIdCookie(): string | null {
  const cookieStore = cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value ?? null;
}

export function setSelectedCompanyIdCookie(companyId: string): void {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, companyId, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

export function clearSelectedCompanyIdCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Resolves the effective company for the user:
 * 1. If cookie is set and user has access (membership or super_admin) → use it
 * 2. Else if user has exactly one company → use it
 * 3. Else → null (user must select)
 */
export async function resolveSelectedCompanyId(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ companyId: string | null; role: string }> {
  const { data: userRow } = await supabase
    .from("users")
    .select("role, company_id")
    .eq("id", userId)
    .single();

  const isSuperAdmin = userRow?.role === "super_admin";

  if (isSuperAdmin) {
    const cookieCompanyId = getSelectedCompanyIdCookie();
    if (cookieCompanyId) {
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("id", cookieCompanyId)
        .single();
      if (company) {
        return { companyId: cookieCompanyId, role: "super_admin" };
      }
    }
    return {
      companyId: userRow?.company_id ?? null,
      role: "super_admin",
    };
  }

  const { data: memberships } = await supabase
    .from("user_companies")
    .select("company_id, role")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) {
    return { companyId: userRow?.company_id ?? null, role: "viewer" };
  }

  const cookieCompanyId = getSelectedCompanyIdCookie();
  if (cookieCompanyId) {
    const match = memberships.find((m) => m.company_id === cookieCompanyId);
    if (match) {
      return { companyId: match.company_id, role: match.role ?? "viewer" };
    }
  }

  if (memberships.length === 1) {
    const m = memberships[0]!;
    return { companyId: m.company_id, role: m.role ?? "viewer" };
  }

  return { companyId: null, role: "viewer" };
}
