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
  amountType: "all" | "debit" | "credit";
}

export type SortBy =
  | "date"
  | "debit"
  | "credit"
  | "balance"
  | "description"
  | "supplier_name"
  | "reference"
  | "source_bank"
  | "category_id";
export type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;
const SCAN_BATCH_SIZE = 200;

/**
 * Same fingerprint as uidx_bank_transactions_dedup (where reference is non-empty), plus
 * de-dupe by row id. Supabase should not return duplicate ids; duplicate logical rows
 * (same account/date/ref/amount) can still exist in older data or if the index did not
 * block an insert, and will otherwise produce doubled rows (and double split children).
 */
function dedupeFetchedParentTransactions(txs: BankTransaction[]): BankTransaction[] {
  const byId = new Map<string, BankTransaction>();
  for (const t of txs) {
    if (!byId.has(t.id)) byId.set(t.id, t);
  }
  const list = Array.from(byId.values());
  const seen = new Set<string>();
  const out: BankTransaction[] = [];
  for (const t of list) {
    const ref = (t.reference ?? "").trim();
    if (ref === "") {
      out.push(t);
      continue;
    }
    const fp = `${t.bank_account_id}\0${t.date}\0${ref}\0${String(t.debit)}\0${String(t.credit)}`;
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(t);
  }
  return out;
}

function emptyFilters(): BankTransactionFilters {
  return { dateFrom: "", dateTo: "", bankAccountId: "", sourceBank: "", search: "", categoryId: "", amountType: "all" };
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
      const defaultAsc: SortBy[] = ["description", "supplier_name", "reference", "source_bank", "category_id"];
      setSortDir(defaultAsc.includes(col) ? "asc" : "desc");
      return col;
    });
    setPage(0);
  }, []);

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
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

  const applyCategoryFilter = useCallback((rows: BankTransaction[], categoryId: string) => {
    if (categoryId === "none") return rows.filter((r) => !r.category_id);
    if (categoryId) return rows.filter((r) => r.category_id === categoryId);
    return rows;
  }, []);

  // Load transactions (paginated + filtered)
  useEffect(() => {
    if (!user || !selectedCompanyId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const buildVisibleRows = async (txs: BankTransaction[]) => {
      if (txs.length === 0) return { rows: [] as BankTransaction[], splitCounts: new Map<string, number>() };
      const ids = txs.map((t) => t.id);
      const { data: splitsData, error: splitErr } = await supabase
        .from("bank_transaction_splits")
        .select("id, transaction_id, description, supplier_name, category_id, amount, notes, sort_order")
        .in("transaction_id", ids)
        .eq("company_id", selectedCompanyId)
        .order("sort_order");

      if (splitErr) throw splitErr;

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

      const seenSplitIds = new Set<string>();
      for (const s of (splitsData ?? []) as {
        id: string;
        transaction_id: string;
        description: string;
        supplier_name: string | null;
        category_id: string | null;
        amount: number;
        notes: string | null;
      }[]) {
        if (seenSplitIds.has(s.id)) continue;
        seenSplitIds.add(s.id);
        counts.set(s.transaction_id, (counts.get(s.transaction_id) ?? 0) + 1);
        const arr = splitsByTx.get(s.transaction_id) ?? [];
        arr.push(s);
        splitsByTx.set(s.transaction_id, arr);
      }

      // Replace parent summary rows with split rows in main table
      const rows: BankTransaction[] = [];
      for (const tx of txs) {
        const txSplits = splitsByTx.get(tx.id) ?? [];
        if (txSplits.length === 0) {
          rows.push(tx);
          continue;
        }
        const isDebitParent = Number(tx.debit) > 0;
        const sourceLabel = extractCardLabel(tx.description ?? "");
        for (const split of txSplits) {
          const amt = Math.abs(Number(split.amount) || 0);
          rows.push({
            ...tx,
            id: `${tx.id}::split::${split.id}`,
            description: split.description || tx.description,
            supplier_name: split.supplier_name ?? tx.supplier_name,
            category_id: split.category_id ?? undefined,
            notes: split.notes ?? tx.notes,
            debit: isDebitParent ? amt : 0,
            credit: isDebitParent ? 0 : amt,
            // Critical business rule: split lines use the charge date of the parent bank transaction.
            // This keeps P&L and bank table aligned to the real billing date (e.g. Diners 15th).
            date: tx.date,
            is_split_line: true,
            split_parent_id: tx.id,
            split_source_label: sourceLabel,
          });
        }
      }

      return { rows, splitCounts: counts };
    };

    const buildBaseQuery = () => {
      let query = supabase
        .from("bank_transactions")
        .select("*", { count: "exact" })
        .eq("company_id", selectedCompanyId)
        .is("merged_into_id", null)
        .order(sortBy, { ascending: sortDir === "asc", nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
      if (filters.dateTo) query = query.lte("date", filters.dateTo);
      if (filters.bankAccountId) query = query.eq("bank_account_id", filters.bankAccountId);
      if (filters.sourceBank) query = query.eq("source_bank", filters.sourceBank);
      if (filters.amountType === "debit") query = query.gt("debit", 0);
      if (filters.amountType === "credit") query = query.gt("credit", 0);
      if (filters.search.trim()) {
        const s = `%${filters.search.trim()}%`;
        query = query.or(`description.ilike.${s},details.ilike.${s},reference.ilike.${s},supplier_name.ilike.${s},operation_code.ilike.${s},batch_code.ilike.${s},source_bank.ilike.${s}`);
      }
      return query;
    };

    const load = async () => {
      try {
        if (filters.categoryId) {
          const pageStart = page * PAGE_SIZE;
          const pageEndExclusive = pageStart + PAGE_SIZE;
          let matchedSeen = 0;
          let offset = 0;
          const pageRows: BankTransaction[] = [];
          const allCounts = new Map<string, number>();

          while (true) {
            const { data, error: qErr } = await buildBaseQuery().range(offset, offset + SCAN_BATCH_SIZE - 1);
            if (cancelled) return;
            if (qErr) throw qErr;

            const txs = dedupeFetchedParentTransactions((data ?? []) as BankTransaction[]);
            if (txs.length === 0) break;

            const { rows, splitCounts: chunkCounts } = await buildVisibleRows(txs);
            const matchedRows = applyCategoryFilter(rows, filters.categoryId);
            const batchStart = matchedSeen;
            const batchEnd = batchStart + matchedRows.length;

            if (batchStart < pageEndExclusive && batchEnd > pageStart) {
              const fromInBatch = Math.max(0, pageStart - batchStart);
              const toInBatch = Math.min(matchedRows.length, pageEndExclusive - batchStart);
              pageRows.push(...matchedRows.slice(fromInBatch, toInBatch));
            }

            chunkCounts.forEach((count, id) => {
              allCounts.set(id, count);
            });
            matchedSeen = batchEnd;

            if (txs.length < SCAN_BATCH_SIZE) break;
            offset += SCAN_BATCH_SIZE;
          }

          if (cancelled) return;
          setTotalCount(matchedSeen);
          setTransactions(pageRows);

          const pageParentIds = new Set(pageRows.filter((r) => !r.is_split_line).map((r) => r.id));
          const pageCounts = new Map<string, number>();
          allCounts.forEach((count, id) => {
            if (pageParentIds.has(id)) pageCounts.set(id, count);
          });
          setSplitCounts(pageCounts);
          setIsLoading(false);
          return;
        }

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, count, error: qErr } = await buildBaseQuery().range(from, to);
        if (cancelled) return;
        if (qErr) throw qErr;

        const txs = dedupeFetchedParentTransactions((data ?? []) as BankTransaction[]);
        const { rows, splitCounts: counts } = await buildVisibleRows(txs);
        if (cancelled) return;

        setTotalCount(count ?? 0);
        setTransactions(rows);
        setSplitCounts(counts);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setIsLoading(false);
      }
    };

    void load();

    return () => { cancelled = true; };
  }, [user, selectedCompanyId, page, filters, sortBy, sortDir, refreshCounter, applyCategoryFilter]);

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
