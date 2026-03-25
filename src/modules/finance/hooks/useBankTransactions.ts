"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import type { BankTransaction, BankAccount, BankCategory, SourceBank } from "../types";

export interface BankTransactionFilters {
  dateFrom: string;
  dateTo: string;
  bankAccountId: string;   // "" = all
  sourceBank: SourceBank | "";
  search: string;
  categoryId: string;       // "" = all, "none" = unclassified
}

export type SortBy = "date" | "debit" | "credit" | "balance";
export type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

function emptyFilters(): BankTransactionFilters {
  return { dateFrom: "", dateTo: "", bankAccountId: "", sourceBank: "", search: "", categoryId: "" };
}

export interface UseBankTransactionsReturn {
  transactions: BankTransaction[];
  accounts: BankAccount[];
  categories: BankCategory[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: BankTransactionFilters;
  sortBy: SortBy;
  sortDir: SortDir;
  isLoading: boolean;
  error: string | null;
  setPage: (p: number) => void;
  setFilters: (f: BankTransactionFilters | ((prev: BankTransactionFilters) => BankTransactionFilters)) => void;
  setSort: (col: SortBy) => void;
  refresh: () => void;
}

export function useBankTransactions(): UseBankTransactionsReturn {
  const authState = useAuth();
  const { state } = useSupabaseAuth();
  const user = authState.status === "authed" ? authState.user : null;
  const selectedCompanyId = state.status === "authed" ? state.user.selectedCompanyId : null;

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<BankCategory[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFiltersState] = useState<BankTransactionFilters>(emptyFilters);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use a state counter (not ref) so that refresh() triggers useEffect even when page is already 0
  const [refreshCounter, setRefreshCounter] = useState(0);

  const setFilters = useCallback(
    (f: BankTransactionFilters | ((prev: BankTransactionFilters) => BankTransactionFilters)) => {
      setFiltersState(f);
      setPage(0);
    },
    []
  );

  const setSort = useCallback((col: SortBy) => {
    setSortBy((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("desc");
      return col;
    });
    setPage(0);
  }, []);

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
    setPage(0);
  }, []);

  // Load bank accounts + categories (re-load when refreshCounter changes)
  useEffect(() => {
    if (!selectedCompanyId) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("bank_accounts").select("*").eq("company_id", selectedCompanyId).eq("is_active", true).order("display_name"),
      supabase.from("bank_categories").select("*").eq("company_id", selectedCompanyId).order("sort_order").order("name"),
    ]).then(([{ data: accts }, { data: cats }]) => {
      if (accts) setAccounts(accts as BankAccount[]);
      if (cats) setCategories(cats as BankCategory[]);
    });
  }, [selectedCompanyId, refreshCounter]);

  // Load transactions (paginated + filtered)
  useEffect(() => {
    if (!user || !selectedCompanyId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("bank_transactions")
      .select("*", { count: "exact" })
      .eq("company_id", selectedCompanyId)
      .order(sortBy, { ascending: sortDir === "asc", nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("date", filters.dateTo);
    if (filters.bankAccountId) query = query.eq("bank_account_id", filters.bankAccountId);
    if (filters.sourceBank) query = query.eq("source_bank", filters.sourceBank);
    if (filters.search.trim()) {
      const s = `%${filters.search.trim()}%`;
      query = query.or(`description.ilike.${s},details.ilike.${s},reference.ilike.${s}`);
    }
    if (filters.categoryId === "none") {
      query = query.is("category_id", null);
    } else if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    query.then(({ data, count, error: qErr }) => {
      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
      } else {
        setTransactions((data ?? []) as BankTransaction[]);
        setTotalCount(count ?? 0);
      }
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [user, selectedCompanyId, page, filters, sortBy, sortDir, refreshCounter]);

  return {
    transactions,
    accounts,
    categories,
    totalCount,
    page,
    pageSize: PAGE_SIZE,
    filters,
    sortBy,
    sortDir,
    isLoading,
    error,
    setPage,
    setFilters,
    setSort,
    refresh,
  };
}
