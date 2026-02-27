"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  DbUploadedFile,
  DbAccount,
  DbTransaction,
  DbTransactionOverride,
  DbCustomGroup,
  DbCustomTag,
  DbAccountTag,
  DbCounterAccountName,
  DbAccountClassificationOverride,
  DbAlertRule,
  ClassificationMode,
  YearlyPnl,
  AccountAnomaly,
} from "@/types/accounting";
import { buildClassifier, calcYearlyPnl, detectAnomalies, countClosingEntries } from "./accountingCalc";
import { useAccountingMutations, type AccountingMutations } from "./useAccountingMutations";

// ── Raw API response ─────────────────────────────────────────

interface AccountingApiData {
  year: number;
  prevYear: number;
  accounts: DbAccount[];
  transactions: DbTransaction[];
  prevTransactions: Pick<DbTransaction, "id" | "account_id" | "group_code" | "transaction_date" | "debit" | "credit">[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  transactionOverrides: DbTransactionOverride[];
  tags: DbCustomTag[];
  accountTags: DbAccountTag[];
  counterNames: DbCounterAccountName[];
  alertRules: DbAlertRule[];
  files: DbUploadedFile[];
}

// ── Hook return type ─────────────────────────────────────────

export interface AccountingData extends AccountingApiData, AccountingMutations {
  isLoading: boolean;
  error: string | null;
  classificationMode: ClassificationMode;
  setClassificationMode: (m: ClassificationMode) => void;
  excludeClosingEntries: boolean;
  setExcludeClosingEntries: (v: boolean) => void;
  closingEntriesCount: number;
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  anomalies: AccountAnomaly[];
  refetch: () => Promise<void>;
  getEffectiveGroup: (accountId: string, txGroupCode: string) => DbCustomGroup | null;
}

// ── Main Hook ────────────────────────────────────────────────

export function useAccountingData(year: number): AccountingData {
  const [raw, setRaw] = useState<AccountingApiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classificationMode, setClassificationMode] = useState<ClassificationMode>("latest");
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

  const classifier = useMemo(() => {
    if (!raw) return null;
    return buildClassifier(
      raw.accounts,
      raw.customGroups,
      raw.classificationOverrides,
      classificationMode,
    );
  }, [raw, classificationMode]);

  const getEffectiveGroup = useCallback(
    (accountId: string, txGroupCode: string) => {
      if (!classifier) return null;
      return classifier.getEffectiveGroup(accountId, txGroupCode);
    },
    [classifier],
  );

  const closingEntriesCount = useMemo(() => {
    if (!raw) return 0;
    return countClosingEntries(raw.transactions);
  }, [raw]);

  const yearlyPnl = useMemo(() => {
    if (!raw || raw.transactions.length === 0) return null;
    return calcYearlyPnl(
      year,
      raw.transactions,
      raw.accounts,
      raw.customGroups,
      raw.classificationOverrides,
      raw.transactionOverrides,
      classificationMode,
      excludeClosingEntries,
    );
  }, [raw, year, classificationMode, excludeClosingEntries]);

  const prevYearlyPnl = useMemo(() => {
    if (!raw || raw.prevTransactions.length === 0) return null;
    return calcYearlyPnl(
      raw.prevYear,
      raw.prevTransactions as DbTransaction[],
      raw.accounts,
      raw.customGroups,
      raw.classificationOverrides,
      [],
      classificationMode,
      false,
    );
  }, [raw, classificationMode]);

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
  };

  return {
    ...(raw ?? emptyData),
    isLoading,
    error,
    classificationMode,
    setClassificationMode,
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
