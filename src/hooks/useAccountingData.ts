"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  DbUploadedFile,
  DbAccount,
  DbTransaction,
  DbTransactionOverride,
  DbCustomTag,
  DbAccountTag,
  DbCounterAccountName,
  DbAlertRule,
  YearlyPnl,
  AccountAnomaly,
} from "@/types/accounting";
import { calcYearlyPnl, detectAnomalies, countClosingEntries, getVirtualGroupsFromPnl } from "./accountingCalc";
import type { VirtualGroup } from "./accountingCalc";
import { useAccountingMutations, type AccountingMutations } from "./useAccountingMutations";

interface AccountingApiData {
  year: number;
  prevYear: number;
  accounts: DbAccount[];
  transactions: DbTransaction[];
  prevTransactions: Pick<DbTransaction, "id" | "account_id" | "group_code" | "transaction_date" | "debit" | "credit">[];
  customGroups: unknown[];
  classificationOverrides: unknown[];
  transactionOverrides: DbTransactionOverride[];
  tags: DbCustomTag[];
  accountTags: DbAccountTag[];
  counterNames: DbCounterAccountName[];
  alertRules: DbAlertRule[];
  files: DbUploadedFile[];
  suppliers: { id: string; counter_account: string; display_name: string; auto_account_code: string | null; auto_account_name: string | null }[];
  revenueGroups: { group_code: string }[];
}

export interface AccountingData extends AccountingApiData, AccountingMutations {
  isLoading: boolean;
  error: string | null;
  excludeClosingEntries: boolean;
  setExcludeClosingEntries: (v: boolean) => void;
  closingEntriesCount: number;
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  anomalies: AccountAnomaly[];
  refetch: () => Promise<void>;
  /** Virtual groups derived from group_code (no stored classifications) */
  customGroups: VirtualGroup[];
  getEffectiveGroup: (accountId: string, txGroupCode: string) => VirtualGroup | null;
}

export function useAccountingData(year: number): AccountingData {
  const [raw, setRaw] = useState<AccountingApiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludeClosingEntries, setExcludeClosingEntries] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounting/data?year=${year}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "שגיאה בטעינת נתונים");
      }
      const data: AccountingApiData = await res.json();
      setRaw(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
    } finally {
      setIsLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const mutations = useAccountingMutations(fetchData);

  const getEffectiveGroup = useCallback((_accountId: string, txGroupCode: string) => {
    if (!txGroupCode) return null;
    return {
      id: txGroupCode,
      name: txGroupCode,
      parent_section: txGroupCode[0] === "7" ? "cost_of_goods" : txGroupCode[0] === "8" ? "operating" : txGroupCode[0] === "9" ? "admin" : "other",
    } as VirtualGroup;
  }, []);

  const closingEntriesCount = useMemo(() => {
    if (!raw) return 0;
    return countClosingEntries(raw.transactions);
  }, [raw]);

  const revenueGroupCodes = useMemo(() => {
    const codes = raw?.revenueGroups?.map((r) => r.group_code) ?? [];
    return new Set(codes);
  }, [raw?.revenueGroups]);

  const yearlyPnl = useMemo(() => {
    if (!raw || raw.transactions.length === 0) return null;
    return calcYearlyPnl(
      year,
      raw.transactions,
      raw.accounts,
      [],
      [],
      raw.transactionOverrides,
      "latest",
      excludeClosingEntries,
      revenueGroupCodes,
    );
  }, [raw, year, excludeClosingEntries, revenueGroupCodes]);

  const prevYearlyPnl = useMemo(() => {
    if (!raw || raw.prevTransactions.length === 0) return null;
    return calcYearlyPnl(
      raw.prevYear,
      raw.prevTransactions as DbTransaction[],
      raw.accounts,
      [],
      [],
      [],
      "latest",
      false,
      revenueGroupCodes,
    );
  }, [raw, revenueGroupCodes]);

  const customGroups: VirtualGroup[] = useMemo(() => {
    if (!yearlyPnl) return [];
    return getVirtualGroupsFromPnl(yearlyPnl);
  }, [yearlyPnl]);

  const anomalies = useMemo(() => {
    if (!yearlyPnl || !raw) return [];
    return detectAnomalies(yearlyPnl, prevYearlyPnl, raw.accounts, raw.alertRules);
  }, [yearlyPnl, prevYearlyPnl, raw]);

  const emptyData: AccountingApiData = {
    year,
    prevYear: year - 1,
    accounts: [],
    transactions: [],
    prevTransactions: [],
    customGroups: [],
    classificationOverrides: [],
    transactionOverrides: [],
    tags: [],
    accountTags: [],
    counterNames: [],
    alertRules: [],
    files: [],
    suppliers: [],
    revenueGroups: [],
  };

  return {
    ...(raw ?? emptyData),
    customGroups,
    isLoading,
    error,
    excludeClosingEntries,
    setExcludeClosingEntries,
    closingEntriesCount,
    yearlyPnl,
    prevYearlyPnl,
    anomalies,
    refetch: fetchData,
    getEffectiveGroup,
    ...mutations,
  };
}
