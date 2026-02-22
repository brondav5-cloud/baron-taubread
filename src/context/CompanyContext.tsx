"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase/config";
import type { Company } from "@/types";
import { useAuth } from "./AuthContext";

// ============================================
// TYPES
// ============================================

interface CompanyContextValue {
  companies: Company[];
  currentCompany: Company | null;
  isLoading: boolean;
  needsCompanySelection: boolean;
  selectCompany: (company: Company) => void;
  clearCompany: () => void;
  getCompanyPath: (collectionName: string) => string | null;
}

interface CompanyProviderProps {
  children: ReactNode;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = "bakery-analytics-company";

// ============================================
// CONTEXT
// ============================================

const CompanyContext = createContext<CompanyContextValue | undefined>(
  undefined,
);

// ============================================
// PROVIDER
// ============================================

export function CompanyProvider({ children }: CompanyProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch companies when user changes
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) {
        setCompanies([]);
        setCurrentCompany(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        let userCompanies: Company[] = [];

        if (user.role === "super_admin") {
          // Super admin sees all companies
          const companiesSnapshot = await getDocs(collection(db, "companies"));
          userCompanies = companiesSnapshot.docs.map(
            (doc: { id: string; data: () => Record<string, unknown> }) => ({
              id: doc.id,
              ...(doc.data().info as Omit<Company, "id">),
            }),
          );
        } else {
          // Other users see only their assigned company
          const companyId = user.company_id;

          if (companyId) {
            try {
              const companyDoc = await getDoc(doc(db, "companies", companyId));
              if (companyDoc.exists()) {
                userCompanies.push({
                  id: companyDoc.id,
                  ...(companyDoc.data().info as Omit<Company, "id">),
                });
              }
            } catch (err) {
              console.error(`Error fetching company ${companyId}:`, err);
            }
          }
        }

        setCompanies(userCompanies);

        // Auto-select if only one company
        if (userCompanies.length === 1 && userCompanies[0]) {
          setCurrentCompany(userCompanies[0]);
          return;
        }

        // Try to restore last selected company
        const lastCompanyId = localStorage.getItem(STORAGE_KEY);
        if (lastCompanyId) {
          const lastCompany = userCompanies.find((c) => c.id === lastCompanyId);
          if (lastCompany) {
            setCurrentCompany(lastCompany);
          }
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      void fetchCompanies();
    }
  }, [user, authLoading]);

  // Select company
  const selectCompany = useCallback((company: Company) => {
    setCurrentCompany(company);
    localStorage.setItem(STORAGE_KEY, company.id);
  }, []);

  // Clear company selection
  const clearCompany = useCallback(() => {
    setCurrentCompany(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Check if user needs to select company
  const needsCompanySelection = !currentCompany && companies.length > 1;

  // Get company-specific collection path
  const getCompanyPath = useCallback(
    (collectionName: string): string | null => {
      if (!currentCompany) return null;
      return `companies/${currentCompany.id}/${collectionName}`;
    },
    [currentCompany],
  );

  const value: CompanyContextValue = {
    companies,
    currentCompany,
    isLoading,
    needsCompanySelection,
    selectCompany,
    clearCompany,
    getCompanyPath,
  };

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);

  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }

  return context;
}

// ============================================
// REQUIRE COMPANY HOOK
// ============================================

export function useRequireCompany() {
  const company = useCompany();

  if (
    !company.isLoading &&
    !company.currentCompany &&
    company.companies.length > 0
  ) {
    // Need to select company
    return { ...company, needsSelection: true };
  }

  return { ...company, needsSelection: false };
}
