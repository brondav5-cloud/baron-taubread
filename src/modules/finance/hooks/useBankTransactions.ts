"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import type { BankTransaction, BankAccount, SourceBank } from "../types";

export interface BankTransactionFilters {
  dateFrom: string;
  dateTo: string;
  bankAccountId: string;   // "" = all
  sourceBank: SourceBank | "";
  search: string;
}

const PAGE_SIZE = 50;

function emptyFilters(): BankTransactionFilters {
  return { dateFrom: "", dateTo: "", bankAccountId: "", sourceBank: "", search: "" };
}

export interface UseBankTransactionsReturn {
  transactions: BankTransaction[];
  accounts: BankAccount[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: BankTransactionFilters;
  isLoading: boolean;
  error: string | null;
  setPage: (p: number) => void;
  setFilters: (f: BankTransactionFilters | ((prev: BankTransactionFilters) => BankTransactionFilters)) => void;
  refresh: () => void;
}

export function useBankTransactions(): UseBankTransactionsReturn {
  const authState = useAuth();
  const { state } = useSupabaseAuth();
  const user = authState.status === "authed" ? authState.user : null;
  const selectedCompanyId = state.status === "authed" ? state.user.selectedCompanyId : null;

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFiltersState] = useState<BankTransactionFilters>(emptyFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshToken = useRef(0);

  const setFilters = useCallback(
    (f: BankTransactionFilters | ((prev: BankTransactionFilters) => BankTransactionFilters)) => {
      setFiltersState(f);
      setPage(0);
    },
    []
  );

  const refresh = useCallback(() => {
    refreshToken.current++;
    setPage(0);
  }, []);

  // Load bank accounts once
  useEffect(() => {
    if (!selectedCompanyId) return;
    const supabase = createClient();
    supabase
      .from("bank_accounts")
      .select("*")
      .eq("company_id", selectedCompanyId)
      .eq("is_active", true)
      .order("display_name")
      .then(({ data }) => {
        if (data) setAccounts(data as BankAccount[]);
      });
  }, [selectedCompanyId]);

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
      .order("date", { ascending: false })
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedCompanyId, page, filters, refreshToken.current]);

  return {
    transactions,
    accounts,
    totalCount,
    page,
    pageSize: PAGE_SIZE,
    filters,
    isLoading,
    error,
    setPage,
    setFilters,
    refresh,
  };
}
