"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface WhoamiCompany {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface AuthedUser {
  userId: string;
  company_id: string;
  role?: string;
  userName?: string;
  userEmail?: string;
  companies: WhoamiCompany[];
  selectedCompanyId: string | null;
  selectedCompanyRole: string | null;
}

export type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "authed"; user: AuthedUser };

export interface SupabaseAuthContextValue {
  state: AuthState;
  selectCompany: (companyId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SupabaseAuthContext =
  createContext<SupabaseAuthContextValue | undefined>(undefined);

export { SupabaseAuthContext };

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const fetchWhoami = useCallback(async () => {
    try {
      const res = await fetch("/api/whoami", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setState({ status: "anon" });
        return;
      }

      setState({
        status: "authed",
        user: {
          userId: data.userId,
          company_id: data.companyId ?? data.selectedCompanyId ?? "",
          role: data.role ?? data.selectedCompanyRole ?? null,
          userName: data.userName,
          userEmail: data.userEmail ?? "",
          companies: data.companies ?? [],
          selectedCompanyId: data.selectedCompanyId ?? data.companyId ?? null,
          selectedCompanyRole:
            data.selectedCompanyRole ?? data.role ?? null,
        },
      });
    } catch {
      setState({ status: "anon" });
    }
  }, []);

  useEffect(() => {
    void fetchWhoami();
  }, [fetchWhoami]);

  const selectCompany = useCallback(
    async (companyId: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/select-company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });
        if (!res.ok) return false;
        await fetchWhoami();
        return true;
      } catch {
        return false;
      }
    },
    [fetchWhoami],
  );

  const value: SupabaseAuthContextValue = {
    state,
    selectCompany,
    refetch: fetchWhoami,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return ctx;
}
