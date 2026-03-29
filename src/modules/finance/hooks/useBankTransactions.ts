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

export type SortBy = "date" | "debit" | "credit" | "balance" | "description" | "supplier_name";
export type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

function emptyFilters(): BankTransactionFilters {
  return { dateFrom: "", dateTo: "", bankAccountId: "", sourceBank: "", search: "", categoryId: "" };
}

function extractCardLabel(text: string): string {
  const m = text.match(/\b\d{4}\b/);
  return m ? `כרטיס ${m[0]}` : text.slice(0, 24);
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
  /** Maps transaction_id → number of saved splits */
  splitCounts: Map<string, number>;
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
  const [splitCounts, setSplitCounts] = useState<Map<string, number>>(new Map());
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
      // Text sorts default to ascending (A→Z); numeric/date sorts default to descending
      const defaultAsc: SortBy[] = ["description", "supplier_name"];
      setSortDir(defaultAsc.includes(col) ? "asc" : "desc");
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
      .is("merged_into_id", null)          // hide transactions merged into another
      .order(sortBy, { ascending: sortDir === "asc", nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("date", filters.dateTo);
    if (filters.bankAccountId) query = query.eq("bank_account_id", filters.bankAccountId);
    if (filters.sourceBank) query = query.eq("source_bank", filters.sourceBank);
    if (filters.search.trim()) {
      const s = `%${filters.search.trim()}%`;
      query = query.or(`description.ilike.${s},details.ilike.${s},reference.ilike.${s},supplier_name.ilike.${s}`);
    }
    query.then(async ({ data, count, error: qErr }) => {
      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setIsLoading(false);
        return;
      }
      const txs = (data ?? []) as BankTransaction[];
      setTotalCount(count ?? 0);

      // Fetch split details for this page's transactions
      if (txs.length > 0) {
        const ids = txs.map((t) => t.id);
        const { data: splitsData } = await supabase
          .from("bank_transaction_splits")
          .select("id, transaction_id, description, supplier_name, category_id, amount, notes, sort_order")
          .in("transaction_id", ids)
          .eq("company_id", selectedCompanyId)
          .order("sort_order");

        const counts = new Map<string, number>();
        const splitsByTx = new Map<string, {
          id: string;
          transaction_id: string;
          description: string;
          supplier_name: string | null;
          category_id: string | null;
          amount: number;
          notes: string | null;
        }[]>();

        for (const s of (splitsData ?? []) as {
          id: string;
          transaction_id: string;
          description: string;
          supplier_name: string | null;
          category_id: string | null;
          amount: number;
          notes: string | null;
        }[]) {
          counts.set(s.transaction_id, (counts.get(s.transaction_id) ?? 0) + 1);
          const arr = splitsByTx.get(s.transaction_id) ?? [];
          arr.push(s);
          splitsByTx.set(s.transaction_id, arr);
        }

        // Replace parent summary rows with split rows in main table
        const visibleRows: BankTransaction[] = [];
        for (const tx of txs) {
          const txSplits = splitsByTx.get(tx.id) ?? [];
          if (txSplits.length === 0) {
            visibleRows.push(tx);
            continue;
          }
          const isDebitParent = Number(tx.debit) > 0;
          const sourceLabel = extractCardLabel(tx.description ?? "");
          for (const split of txSplits) {
            const amt = Math.abs(Number(split.amount) || 0);
            visibleRows.push({
              ...tx,
              id: `${tx.id}::split::${split.id}`,
              description: split.description || tx.description,
              supplier_name: split.supplier_name ?? tx.supplier_name,
              category_id: split.category_id ?? undefined,
              notes: split.notes ?? tx.notes,
              debit: isDebitParent ? amt : 0,
              credit: isDebitParent ? 0 : amt,
              is_split_line: true,
              split_parent_id: tx.id,
              split_source_label: sourceLabel,
            });
          }
        }

        const categoryFilteredRows = filters.categoryId === "none"
          ? visibleRows.filter((r) => !r.category_id)
          : filters.categoryId
            ? visibleRows.filter((r) => r.category_id === filters.categoryId)
            : visibleRows;

        if (!cancelled) {
          setTransactions(categoryFilteredRows);
          setSplitCounts(counts);
        }
      } else {
        setTransactions([]);
        setSplitCounts(new Map());
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
    splitCounts,
    setPage,
    setFilters,
    setSort,
    refresh,
  };
}
