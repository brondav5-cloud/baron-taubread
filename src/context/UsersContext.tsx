"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getCompanyUsersMulti,
  deactivateUser as deactivateUserInDb,
} from "@/lib/supabase/users.queries";
import {
  getTaskCategories,
  insertTaskCategory,
  updateTaskCategory as updateCategoryInDb,
  deleteTaskCategory as deleteCategoryInDb,
  reorderTaskCategories as reorderCategoriesInDb,
} from "@/lib/supabase/categories.queries";
import type { DbUser, DbTaskCategory } from "@/types/supabase";

// ============================================
// APP-LEVEL TYPES (replace DemoUser / TaskCategory)
// ============================================

import type { UserPermissions } from "@/types/supabase";

export interface AddUserInput {
  name: string;
  email: string;
  password?: string;
  position: string;
  department: string;
  avatar: string;
  role?: string;
  permissions?: UserPermissions | null;
}

export interface AppUser {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  permissions?: UserPermissions | null;
}

export interface TaskCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultAssigneeId?: string;
  defaultAssigneeName?: string;
  isActive: boolean;
  order: number;
}

// ============================================
// MAPPERS
// ============================================

function dbUserToAppUser(u: DbUser): AppUser {
  return {
    id: u.id,
    name: u.name ?? u.email,
    role: u.role ?? "viewer",
    avatar: u.avatar ?? "👤",
    email: u.email,
    phone: ((u as unknown as Record<string, unknown>).phone as string) ?? "",
    department: u.department ?? "",
    position: u.position ?? "",
    permissions: u.permissions ?? undefined,
  };
}

function dbCatToCategory(c: DbTaskCategory, users: AppUser[]): TaskCategory {
  const assignee = c.default_assignee_id
    ? users.find((u) => u.id === c.default_assignee_id)
    : undefined;
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    defaultAssigneeId: c.default_assignee_id ?? undefined,
    defaultAssigneeName: assignee?.name,
    isActive: c.is_active,
    order: c.sort_order,
  };
}

// ============================================
// CONTEXT TYPES
// ============================================

interface UsersContextType {
  currentUser: AppUser;
  allUsers: AppUser[];
  categories: TaskCategory[];
  isLoading: boolean;
  refetch: () => Promise<void>;

  addUser: (data: AddUserInput) => Promise<AppUser | null>;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  getUserById: (id: string) => AppUser | undefined;
  getUsersByRole: (role: string) => AppUser[];

  addCategory: (
    data: Omit<TaskCategory, "id" | "order">,
  ) => Promise<TaskCategory | null>;
  updateCategory: (id: string, updates: Partial<TaskCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (categoryIds: string[]) => Promise<void>;
  getCategoryById: (id: string) => TaskCategory | undefined;
}

const UsersContext = createContext<UsersContextType | null>(null);

// ============================================
// FALLBACK for unauthenticated state
// ============================================

const FALLBACK_USER: AppUser = {
  id: "anon",
  name: "אורח",
  role: "viewer",
  avatar: "👤",
  email: "",
  phone: "",
  department: "",
  position: "",
};

// ============================================
// PROVIDER
// ============================================

interface UsersProviderProps {
  children: ReactNode;
}

export function UsersProvider({ children }: UsersProviderProps) {
  const auth = useAuth();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser>(FALLBACK_USER);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const userId = auth.status === "authed" ? auth.user.userId : null;
  // All company IDs the current user belongs to (for cross-company user lookup)
  const allCompanyIds =
    auth.status === "authed"
      ? auth.user.companies.map((c) => c.id)
      : [];

  // Use first available company ID (allCompanyIds preferred, fallback to companyId)
  const effectiveCompanyId =
    allCompanyIds.length > 0 ? allCompanyIds[0] : (companyId ?? "");

  const fetchAll = useCallback(async () => {
    const companyList = allCompanyIds.length > 0
      ? allCompanyIds
      : companyId ? [companyId] : [];

    if (!companyList.length || !userId) {
      setUsers([]);
      setCategories([]);
      setCurrentUser(FALLBACK_USER);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [dbUsers, dbCategories] = await Promise.all([
        getCompanyUsersMulti(companyList),
        getTaskCategories(effectiveCompanyId || companyList[0]!),
      ]);

      const appUsers = dbUsers.map(dbUserToAppUser);
      setUsers(appUsers);

      const me = appUsers.find((u) => u.id === userId);
      if (me) setCurrentUser(me);

      setCategories(dbCategories.map((c) => dbCatToCategory(c, appUsers)));
    } catch (err) {
      console.error("Error loading users/categories:", err);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, userId, allCompanyIds.join(","), effectiveCompanyId]);

  useEffect(() => {
    if (auth.status !== "loading") {
      void fetchAll();
    }
  }, [auth.status, fetchAll]);

  // ============================================
  // USER ACTIONS
  // ============================================

  const addUser = useCallback(
    async (data: AddUserInput): Promise<AppUser | null> => {
      if (!companyId) return null;
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password || undefined,
            role: (data.role as "admin" | "editor" | "viewer") ?? "editor",
            position: data.position,
            department: data.department,
            avatar: data.avatar,
            permissions: data.permissions ?? null,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Error inserting user:", err);
          return null;
        }
        const result = await res.json();
        await fetchAll();
        return dbUserToAppUser(result);
      } catch (e) {
        console.error("Error inserting user:", e);
        return null;
      }
    },
    [companyId, fetchAll],
  );

  const updateUser = useCallback(
    async (id: string, updates: Partial<AppUser>) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name       !== undefined) dbUpdates.name       = updates.name;
      if (updates.email      !== undefined) dbUpdates.email      = updates.email;
      if (updates.phone      !== undefined) dbUpdates.phone      = updates.phone;
      if (updates.department !== undefined) dbUpdates.department = updates.department;
      if (updates.avatar     !== undefined) dbUpdates.avatar     = updates.avatar;
      if (updates.position   !== undefined) dbUpdates.position   = updates.position;
      if (updates.role       !== undefined) dbUpdates.role       = updates.role;
      if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;

      // Use API route (service role) to bypass RLS restrictions on users table
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, updates: dbUpdates }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Error updating user:", err);
      }

      await fetchAll();
    },
    [fetchAll],
  );

  const removeUser = useCallback(
    async (id: string) => {
      await deactivateUserInDb(id);
      await fetchAll();
    },
    [fetchAll],
  );

  const getUserById = useCallback(
    (id: string): AppUser | undefined => users.find((u) => u.id === id),
    [users],
  );

  const getUsersByRole = useCallback(
    (role: string): AppUser[] => users.filter((u) => u.role === role),
    [users],
  );

  // ============================================
  // CATEGORY ACTIONS
  // ============================================

  const getCategoryById = useCallback(
    (id: string): TaskCategory | undefined =>
      categories.find((c) => c.id === id),
    [categories],
  );

  const addCategory = useCallback(
    async (
      data: Omit<TaskCategory, "id" | "order">,
    ): Promise<TaskCategory | null> => {
      if (!companyId) return null;
      const result = await insertTaskCategory({
        company_id: companyId,
        name: data.name,
        icon: data.icon,
        color: data.color,
        default_assignee_id: data.defaultAssigneeId ?? null,
        is_active: data.isActive,
        sort_order: categories.length + 1,
      });
      if (result) {
        await fetchAll();
        return dbCatToCategory(result, users);
      }
      return null;
    },
    [companyId, categories.length, fetchAll, users],
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<TaskCategory>) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.defaultAssigneeId !== undefined)
        dbUpdates.default_assignee_id = updates.defaultAssigneeId;
      if (updates.isActive !== undefined)
        dbUpdates.is_active = updates.isActive;
      if (updates.order !== undefined) dbUpdates.sort_order = updates.order;

      await updateCategoryInDb(id, dbUpdates);
      await fetchAll();
    },
    [fetchAll],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await deleteCategoryInDb(id);
      await fetchAll();
    },
    [fetchAll],
  );

  const reorderCategories = useCallback(
    async (categoryIds: string[]) => {
      await reorderCategoriesInDb(categoryIds);
      await fetchAll();
    },
    [fetchAll],
  );

  // ============================================
  // RENDER
  // ============================================

  const value: UsersContextType = {
    currentUser,
    allUsers: users,
    categories,
    isLoading,
    refetch: fetchAll,
    addUser,
    updateUser,
    removeUser,
    getUserById,
    getUsersByRole,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getCategoryById,
  };

  return (
    <UsersContext.Provider value={value}>{children}</UsersContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useUsers(): UsersContextType {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error("useUsers must be used within UsersProvider");
  }
  return context;
}
