"use client";

import { useMemo } from "react";
import { useUsers } from "@/context/UsersContext";
import type { UserPermissionModule } from "@/types/supabase";

export const MODULE_TO_PATH: Record<string, string[]> = {
  dashboard: ["/dashboard"],
  stores: ["/dashboard/stores"],
  products: ["/dashboard/products"],
  distribution: ["/dashboard/distribution-v2"],
  tasks: ["/dashboard/tasks"],
  faults: ["/dashboard/faults"],
  treatment: ["/dashboard/treatment", "/dashboard/field-summary"],
  work_plan: ["/dashboard/work-plan"],
  competitors: ["/dashboard/competitors"],
  compare: ["/dashboard/compare"],
  visits: ["/dashboard/visits"],
  profitability: ["/dashboard/profitability"],
  upload: ["/dashboard/upload"],
  settings: ["/dashboard/settings"],
  expenses: ["/dashboard/expenses"],
  meetings: ["/dashboard/meetings"],
  finance: ["/dashboard/finance"],
};

// Modules that are restricted by default — non-admins must be explicitly granted access
const RESTRICTED_BY_DEFAULT = new Set<string>(["finance"]);

export function usePermissions() {
  const { currentUser } = useUsers();

  const canAccess = useMemo(() => {
    const perms = currentUser.permissions;
    const role = currentUser.role;
    const isAdmin = role === "super_admin" || role === "admin";

    return (module: UserPermissionModule): boolean => {
      if (isAdmin) return true;
      if (perms && typeof perms[module] === "boolean")
        return perms[module] === true;
      return !RESTRICTED_BY_DEFAULT.has(module);
    };
  }, [currentUser.permissions, currentUser.role]);

  const filteredNavItems = useMemo(() => {
    const moduleByHref = Object.fromEntries(
      Object.entries(MODULE_TO_PATH).flatMap(([mod, paths]) =>
        paths.map((p) => [p, mod as UserPermissionModule]),
      ),
    ) as Record<string, UserPermissionModule>;
    return (href: string): boolean => {
      for (const [path, module] of Object.entries(moduleByHref)) {
        if (href === path || href.startsWith(path + "/"))
          return canAccess(module);
      }
      return true;
    };
  }, [canAccess]);

  return { canAccess, filteredNavItems, currentUser };
}
