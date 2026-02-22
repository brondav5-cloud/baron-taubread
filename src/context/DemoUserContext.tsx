"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { DemoUser, TaskCategory } from "@/types/task";
import demoData from "@/lib/data/tasks-demo.json";

// ============================================
// CONTEXT TYPES
// ============================================

interface DemoUserContextType {
  // משתמש נוכחי
  currentUser: DemoUser;
  setCurrentUser: (user: DemoUser) => void;

  // רשימת כל המשתמשים
  allUsers: DemoUser[];
  updateUser: (id: string, updates: Partial<DemoUser>) => void;
  resetUsers: () => void;

  // קטגוריות
  categories: TaskCategory[];
  addCategory: (category: Omit<TaskCategory, "id" | "order">) => TaskCategory;
  updateCategory: (id: string, updates: Partial<TaskCategory>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (categoryIds: string[]) => void;
  resetCategories: () => void;

  // פונקציות עזר
  getUserById: (id: string) => DemoUser | undefined;
  getUsersByRole: (role: string) => DemoUser[];
  getCategoryById: (id: string) => TaskCategory | undefined;
}

// ============================================
// CONTEXT
// ============================================

const DemoUserContext = createContext<DemoUserContextType | null>(null);

// ============================================
// STORAGE KEYS
// ============================================

const USER_STORAGE_KEY = "demo_current_user";
const CATEGORIES_STORAGE_KEY = "demo_task_categories";
const USERS_STORAGE_KEY = "demo_users";

// ============================================
// PROVIDER
// ============================================

interface DemoUserProviderProps {
  children: ReactNode;
}

export function DemoUserProvider({ children }: DemoUserProviderProps) {
  const defaultUsers = demoData.users as DemoUser[];
  const defaultCategories = demoData.categories as TaskCategory[];

  // State
  const [users, setUsers] = useState<DemoUser[]>(defaultUsers);
  const [currentUser, setCurrentUserState] = useState<DemoUser>(
    defaultUsers[0]!,
  );
  const [categories, setCategories] =
    useState<TaskCategory[]>(defaultCategories);
  const [isInitialized, setIsInitialized] = useState(false);

  const allUsers = users;

  // טעינה מ-localStorage בהתחלה
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      let userList = defaultUsers;
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers) as DemoUser[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUsers(parsed);
          userList = parsed;
        }
      }

      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as DemoUser;
        const exists = userList.find((u) => u.id === parsed.id);
        if (exists) setCurrentUserState(exists);
      }

      const savedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (savedCategories) setCategories(JSON.parse(savedCategories));
    } catch {
      // אם יש שגיאה, נשאר עם ברירות המחדל
    }
    setIsInitialized(true);
  }, [defaultUsers]);

  // שמירת קטגוריות ו-users ב-localStorage
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(
          CATEGORIES_STORAGE_KEY,
          JSON.stringify(categories),
        );
      } catch {
        /* ignore */
      }
    }
  }, [categories, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      } catch {
        /* ignore */
      }
    }
  }, [users, isInitialized]);

  // ============================================
  // USER ACTIONS
  // ============================================

  const setCurrentUser = useCallback((user: DemoUser) => {
    setCurrentUserState(user);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<DemoUser>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    );
    setCurrentUserState((prev) =>
      prev.id === id ? { ...prev, ...updates } : prev,
    );
  }, []);

  const resetUsers = useCallback(() => {
    setUsers(defaultUsers);
    setCurrentUserState(defaultUsers[0]!);
    try {
      localStorage.removeItem(USERS_STORAGE_KEY);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultUsers[0]));
    } catch {
      /* ignore */
    }
  }, [defaultUsers]);

  const getUserById = useCallback(
    (id: string): DemoUser | undefined => allUsers.find((u) => u.id === id),
    [allUsers],
  );

  const getUsersByRole = useCallback(
    (role: string): DemoUser[] => allUsers.filter((u) => u.role === role),
    [allUsers],
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
    (categoryData: Omit<TaskCategory, "id" | "order">): TaskCategory => {
      const newCategory: TaskCategory = {
        ...categoryData,
        id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order: categories.length + 1,
      };
      setCategories((prev) => [...prev, newCategory]);
      return newCategory;
    },
    [categories.length],
  );

  const updateCategory = useCallback(
    (id: string, updates: Partial<TaskCategory>) => {
      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat)),
      );
    },
    [],
  );

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  }, []);

  const reorderCategories = useCallback((categoryIds: string[]) => {
    setCategories((prev) => {
      const reordered = categoryIds
        .map((id, index) => {
          const cat = prev.find((c) => c.id === id);
          return cat ? { ...cat, order: index + 1 } : null;
        })
        .filter((c): c is TaskCategory => c !== null);
      return reordered;
    });
  }, []);

  const resetCategories = useCallback(() => {
    setCategories(defaultCategories);
    try {
      localStorage.removeItem(CATEGORIES_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [defaultCategories]);

  // מניעת hydration mismatch
  if (!isInitialized) {
    return null;
  }

  const value: DemoUserContextType = {
    currentUser,
    setCurrentUser,
    allUsers,
    updateUser,
    resetUsers,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    resetCategories,
    getUserById,
    getUsersByRole,
    getCategoryById,
  };

  return (
    <DemoUserContext.Provider value={value}>
      {children}
    </DemoUserContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useDemoUser(): DemoUserContextType {
  const context = useContext(DemoUserContext);
  if (!context) {
    throw new Error("useDemoUser must be used within DemoUserProvider");
  }
  return context;
}
