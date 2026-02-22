// ============================================
// USER & AUTH TYPES
// ============================================

export type UserRole = "super_admin" | "admin" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_id: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// ============================================
// ROLE PERMISSIONS
// ============================================

export const ROLE_PERMISSIONS = {
  super_admin: {
    canDeleteAllData: true,
    canUploadFiles: true,
    canManageSettings: true,
    canManageUsers: true,
    canView: true,
  },
  admin: {
    canDeleteAllData: false,
    canUploadFiles: true,
    canManageSettings: true,
    canManageUsers: false,
    canView: true,
  },
  editor: {
    canDeleteAllData: false,
    canUploadFiles: true,
    canManageSettings: false,
    canManageUsers: false,
    canView: true,
  },
  viewer: {
    canDeleteAllData: false,
    canUploadFiles: false,
    canManageSettings: false,
    canManageUsers: false,
    canView: true,
  },
} as const;

export type RolePermissions = (typeof ROLE_PERMISSIONS)[UserRole];

// Helper function to check permission
export function hasPermission(
  role: UserRole,
  permission: keyof RolePermissions,
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

// ============================================
// COMPANY TYPES
// ============================================

export interface Company {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  primaryColor?: string;
  isActive: boolean;
  createdAt: string;
}
