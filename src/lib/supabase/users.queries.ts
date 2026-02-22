import { createClient } from "./client";
import type { DbUser, UserPermissions } from "@/types/supabase";

export async function getCompanyUsers(companyId: string): Promise<DbUser[]> {
  const supabase = createClient();
  // Get memberships: user_id + role per company
  const { data: memberships, error: ucError } = await supabase
    .from("user_companies")
    .select("user_id, role")
    .eq("company_id", companyId);

  if (ucError || !memberships?.length) {
    if (ucError) console.error("Error fetching user memberships:", ucError);
    return [];
  }

  const userIds = memberships.map((m) => m.user_id);
  const roleByUserId = new Map(
    memberships.map((m) => [m.user_id, m.role ?? "viewer"]),
  );
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("id", userIds)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching company users:", error);
    return [];
  }
  // Override role with per-company role from user_companies
  return (data || []).map((u) => ({
    ...u,
    role: (roleByUserId.get(u.id) as DbUser["role"]) ?? u.role,
  }));
}

export async function getUserById(userId: string): Promise<DbUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data;
}

export async function insertUser(
  user: Pick<
    DbUser,
    | "company_id"
    | "email"
    | "name"
    | "role"
    | "position"
    | "department"
    | "avatar"
  > & { permissions?: UserPermissions | null },
): Promise<DbUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .insert({
      ...user,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting user:", error);
    return null;
  }
  return data;
}

/**
 * Updates user. Privileged fields (role, permissions, company_id) are protected
 * by DB trigger - only admin/super_admin can change them.
 * When companyId is provided and role changes, also updates user_companies.
 */
export async function updateUser(
  userId: string,
  updates: Partial<
    Pick<
      DbUser,
      | "name"
      | "department"
      | "avatar"
      | "position"
      | "phone"
      | "email"
      | "role"
      | "permissions"
    >
  >,
  companyId?: string,
): Promise<boolean> {
  const supabase = createClient();
  const { role, ...restUpdates } = updates;

  if (role !== undefined && companyId) {
    const { error: ucErr } = await supabase
      .from("user_companies")
      .update({ role })
      .eq("user_id", userId)
      .eq("company_id", companyId);
    if (ucErr) {
      console.error("Error updating user_companies role:", ucErr);
    }
  }

  const dbUpdates = {
    ...restUpdates,
    ...(role !== undefined && { role }),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("users")
    .update(dbUpdates)
    .eq("id", userId);

  if (error) {
    console.error("Error updating user:", error);
    return false;
  }
  return true;
}

export async function deactivateUser(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("Error deactivating user:", error);
    return false;
  }
  return true;
}
