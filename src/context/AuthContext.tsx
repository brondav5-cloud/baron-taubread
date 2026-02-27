"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { type User as FirebaseUser } from "firebase/auth";
import type { User, UserRole, ApiResponse } from "@/types";
import {
  subscribeToAuthState,
  signIn as firebaseSignIn,
  signOut as firebaseSignOut,
  resetPassword as firebaseResetPassword,
  getUserData,
} from "@/services/firebase/auth";

// ============================================
// TYPES
// ============================================

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<ApiResponse<User>>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<ApiResponse<void>>;
  clearError: () => void;
  hasRole: (role: UserRole) => boolean;
  hasMinRole: (minRole: UserRole) => boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  super_admin: 4,
};

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const userData = await getUserData(fbUser.uid);
          setUser(userData);
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await firebaseSignIn(email, password);

      if (result.success && result.data) {
        setUser(result.data);
      } else {
        setError(result.error ?? "שגיאה בהתחברות");
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true);

    try {
      await firebaseSignOut();
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    setError(null);

    const result = await firebaseResetPassword(email);

    if (!result.success) {
      setError(result.error ?? "שגיאה באיפוס סיסמה");
    }

    return result;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if user has specific role
  const hasRole = useCallback(
    (role: UserRole): boolean => {
      return user?.role === role;
    },
    [user],
  );

  // Check if user has minimum role level
  const hasMinRole = useCallback(
    (minRole: UserRole): boolean => {
      if (!user) return false;
      return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minRole];
    },
    [user],
  );

  const value: AuthContextValue = {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    signOut,
    resetPassword,
    clearError,
    hasRole,
    hasMinRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// ============================================
// REQUIRE AUTH HOOK
// ============================================

export function useRequireAuth(redirectTo = "/login") {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [auth.isLoading, auth.isAuthenticated, redirectTo]);

  return auth;
}

// ============================================
// REQUIRE ROLE HOOK
// ============================================

export function useRequireRole(minRole: UserRole, redirectTo = "/dashboard") {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !auth.hasMinRole(minRole)) {
      window.location.href = redirectTo;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auth.hasMinRole is a stable method; only re-run when auth state or role/redirect changes
  }, [auth.isLoading, auth.isAuthenticated, minRole, redirectTo]);

  return auth;
}
