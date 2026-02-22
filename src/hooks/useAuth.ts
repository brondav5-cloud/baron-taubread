"use client";

import { useContext } from "react";
import {
  SupabaseAuthContext,
  type SupabaseAuthContextValue,
} from "@/context/SupabaseAuthContext";

// Re-export types for consumers
export type { AuthedUser } from "@/context/SupabaseAuthContext";
export type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "authed"; user: import("@/context/SupabaseAuthContext").AuthedUser };

/**
 * Auth state from whoami (Supabase).
 * For selectCompany/refetch use useSupabaseAuth().
 */
export function useAuth() {
  const ctx = useContext(
    SupabaseAuthContext,
  ) as SupabaseAuthContextValue | undefined;
  if (!ctx) {
    return { status: "loading" as const };
  }
  return ctx.state;
}
