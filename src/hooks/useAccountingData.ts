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
  MonthlyPnl,
  YearlyPnl,
  ParentSection,
  AccountAnomaly,
} from "@/types/accounting";
import { PARENT_SECTION_ORDER } from "@/types/accounting";

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

export interface AccountingData extends AccountingApiData {
  isLoading: boolean;
  error: string | null;
  classificationMode: ClassificationMode;
  setClassificationMode: (m: ClassificationMode) => void;
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  anomalies: AccountAnomaly[];
  refetch: () => Promise<void>;
  // Mutation helpers
  saveClassificationOverride: (accountId: string, groupId: string, note?: string) => Promise<boolean>;
  deleteClassificationOverride: (accountId: string) => Promise<boolean>;
  saveTransactionOverride: (txId: string, type: DbTransactionOverride["override_type"], newValue?: string, note?: string) => Promise<boolean>;
  deleteTransactionOverride: (id: string) => Promise<boolean>;
  saveGroup: (group: Partial<DbCustomGroup> & { name: string; parent_section: ParentSection; group_codes: string[] }) => Promise<boolean>;
  deleteGroup: (id: string) => Promise<boolean>;
  saveTag: (tag: Partial<DbCustomTag> & { name: string; color: string }) => Promise<boolean>;
  deleteTag: (id: string) => Promise<boolean>;
  assignTag: (accountId: string, tagId: string) => Promise<boolean>;
  removeTag: (accountId: string, tagId: string) => Promise<boolean>;
  saveCounterName: (code: string, displayName: string) => Promise<boolean>;
  saveAlertRule: (rule: Partial<DbAlertRule>) => Promise<boolean>;
  deleteAlertRule: (id: string) => Promise<boolean>;
  // Classification lookup
  getEffectiveGroup: (accountId: string, txGroupCode: string) => DbCustomGroup | null;
}

// ── 3-Layer classification ────────────────────────────────────

function buildClassifier(
  accounts: DbAccount[],
  customGroups: DbCustomGroup[],
  classificationOverrides: DbAccountClassificationOverride[],
  mode: ClassificationMode,
) {
  const overrideMap = new Map<string, string>(); // accountId → custom_group_id
  for (const co of classificationOverrides) {
    overrideMap.set(co.account_id, co.custom_group_id);
  }

  const groupById = new Map<string, DbCustomGroup>();
  for (const g of customGroups) groupById.set(g.id, g);

  const accountById = new Map<string, DbAccount>();
  for (const a of accounts) accountById.set(a.id, a);

  // Build group_code → group mapping for fast lookup
  const gcToGroup = new Map<string, DbCustomGroup>();
  for (const g of customGroups) {
    for (const gc of g.group_codes) {
      gcToGroup.set(gc, g);
    }
  }

  function getEffectiveGroup(accountId: string, txGroupCode: string): DbCustomGroup | null {
    // Layer 1: account classification override (always wins)
    const overrideGroupId = overrideMap.get(accountId);
    if (overrideGroupId) {
      return groupById.get(overrideGroupId) ?? null;
    }

    // Layer 2: custom_groups by effective group_code
    const effectiveGc =
      mode === "latest"
        ? (accountById.get(accountId)?.latest_group_code ?? txGroupCode)
        : txGroupCode;

    return gcToGroup.get(effectiveGc) ?? null;
  }

  return { getEffectiveGroup };
}

// ── P&L Calculation ──────────────────────────────────────────

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function calcYearlyPnl(
  year: number,
  transactions: Pick<DbTransaction, "id" | "account_id" | "group_code" | "transaction_date" | "debit" | "credit">[],
  accounts: DbAccount[],
  customGroups: DbCustomGroup[],
  classificationOverrides: DbAccountClassificationOverride[],
  transactionOverrides: DbTransactionOverride[],
  mode: ClassificationMode,
): YearlyPnl {
  const { getEffectiveGroup } = buildClassifier(accounts, customGroups, classificationOverrides, mode);

  // Build override lookup: txId → list of overrides
  const overridesByTx = new Map<string, DbTransactionOverride[]>();
  for (const ov of transactionOverrides) {
    const list = overridesByTx.get(ov.transaction_id) ?? [];
    list.push(ov);
    overridesByTx.set(ov.transaction_id, list);
  }

  // Build account lookup
  const accountById = new Map<string, DbAccount>();
  for (const a of accounts) accountById.set(a.id, a);

  const emptyMonth = (month: number): MonthlyPnl => ({
    month,
    revenue: 0,
    bySection: { cost_of_goods: 0, operating: 0, admin: 0, finance: 0, other: 0 },
    byGroup: new Map(),
    byAccount: new Map(),
    grossProfit: 0,
    operatingProfit: 0,
    adminTotal: 0,
    financeTotal: 0,
    otherTotal: 0,
    netProfit: 0,
  });

  const monthlyData: MonthlyPnl[] = MONTHS.map(emptyMonth);

  for (const tx of transactions) {
    const txDate = new Date(tx.transaction_date);
    const txYear = txDate.getFullYear();
    if (txYear !== year) continue;

    const month = txDate.getMonth() + 1; // 1-based
    const md = monthlyData[month - 1]!;

    // Apply overrides
    const overrides = overridesByTx.get(tx.id) ?? [];
    const isExcluded = overrides.some((o) => o.override_type === "exclude");
    if (isExcluded) continue;

    const amountOverride = overrides.find((o) => o.override_type === "amount");
    let debit = tx.debit;
    let credit = tx.credit;
    if (amountOverride?.new_value) {
      const v = parseFloat(amountOverride.new_value);
      if (!isNaN(v)) {
        debit = v > 0 ? v : 0;
        credit = v < 0 ? -v : 0;
      }
    }

    const account = accountById.get(tx.account_id);
    if (!account) continue;

    if (account.account_type === "revenue") {
      const amount = credit - debit; // revenue = credit net
      md.revenue += amount;
    } else {
      const amount = debit - credit; // expense = debit net
      const group = getEffectiveGroup(tx.account_id, tx.group_code);
      const section: ParentSection = group?.parent_section ?? "other";

      md.bySection[section] += amount;

      if (group) {
        md.byGroup.set(group.id, (md.byGroup.get(group.id) ?? 0) + amount);
      }
      md.byAccount.set(tx.account_id, (md.byAccount.get(tx.account_id) ?? 0) + amount);
    }
  }

  // Calculate derived values for each month
  for (const md of monthlyData) {
    md.grossProfit = md.revenue - md.bySection.cost_of_goods;
    md.operatingProfit = md.grossProfit - md.bySection.operating;
    md.adminTotal = md.bySection.admin;
    md.financeTotal = md.bySection.finance;
    md.otherTotal = md.bySection.other;
    md.netProfit = md.operatingProfit - md.adminTotal - md.financeTotal - md.otherTotal;
  }

  // Build totals
  const total = emptyMonth(0);
  for (const md of monthlyData) {
    total.revenue += md.revenue;
    for (const sec of PARENT_SECTION_ORDER) {
      total.bySection[sec] += md.bySection[sec];
    }
    md.byGroup.forEach((val, key) => {
      total.byGroup.set(key, (total.byGroup.get(key) ?? 0) + val);
    });
    md.byAccount.forEach((val, key) => {
      total.byAccount.set(key, (total.byAccount.get(key) ?? 0) + val);
    });
  }
  total.grossProfit = total.revenue - total.bySection.cost_of_goods;
  total.operatingProfit = total.grossProfit - total.bySection.operating;
  total.adminTotal = total.bySection.admin;
  total.financeTotal = total.bySection.finance;
  total.otherTotal = total.bySection.other;
  total.netProfit = total.operatingProfit - total.adminTotal - total.financeTotal - total.otherTotal;

  return { year, months: monthlyData, total };
}

// ── Anomaly Detection ────────────────────────────────────────

function detectAnomalies(
  pnl: YearlyPnl,
  prevPnl: YearlyPnl | null,
  accounts: DbAccount[],
  alertRules: DbAlertRule[],
): AccountAnomaly[] {
  const anomalies: AccountAnomaly[] = [];
  const accountById = new Map<string, DbAccount>();
  for (const a of accounts) accountById.set(a.id, a);

  // Default thresholds
  const monthlySpikePct = alertRules.find(r => r.rule_type === "monthly_change_pct" && !r.account_id)?.threshold_value ?? 30;
  const yearlyChangePct = alertRules.find(r => r.rule_type === "yearly_change_pct" && !r.account_id)?.threshold_value ?? 40;
  const consecutiveCount = alertRules.find(r => r.rule_type === "consecutive_increase" && !r.account_id)?.threshold_value ?? 3;

  // Collect all unique accountIds
  const allAccountIdsSet = new Set<string>();
  for (const md of pnl.months) {
    md.byAccount.forEach((_, id) => allAccountIdsSet.add(id));
  }
  const allAccountIds = Array.from(allAccountIdsSet);

  for (const accountId of allAccountIds) {
    const account = accountById.get(accountId);
    if (!account) continue;

    const monthlyAmounts = pnl.months.map((md) => md.byAccount.get(accountId) ?? 0);
    const nonZeroMonths = monthlyAmounts.filter((v) => v !== 0);
    if (nonZeroMonths.length < 2) continue;

    const avg = nonZeroMonths.reduce((s, v) => s + v, 0) / nonZeroMonths.length;
    const variance = nonZeroMonths.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / nonZeroMonths.length;
    const stddev = Math.sqrt(variance);

    // Monthly spike detection (stddev-based)
    for (let m = 0; m < 12; m++) {
      const val = monthlyAmounts[m] ?? 0;
      if (val === 0) continue;
      const deviation = stddev > 0 ? (val - avg) / stddev : 0;
      if (deviation > 2.0) {
        anomalies.push({
          accountId,
          accountCode: account.code,
          accountName: account.name,
          type: "monthly_spike",
          severity: "critical",
          month: m + 1,
          currentValue: val,
          referenceValue: avg,
          changePct: avg > 0 ? ((val - avg) / avg) * 100 : 0,
        });
      } else if (deviation > 1.5) {
        anomalies.push({
          accountId,
          accountCode: account.code,
          accountName: account.name,
          type: "monthly_spike",
          severity: "warning",
          month: m + 1,
          currentValue: val,
          referenceValue: avg,
          changePct: avg > 0 ? ((val - avg) / avg) * 100 : 0,
        });
      }
    }

    // YoY change
    if (prevPnl) {
      const currTotal = pnl.total.byAccount.get(accountId) ?? 0;
      const prevTotal = prevPnl.total.byAccount.get(accountId) ?? 0;
      if (prevTotal > 0 && currTotal > 0) {
        const pct = ((currTotal - prevTotal) / prevTotal) * 100;
        if (Math.abs(pct) > yearlyChangePct) {
          anomalies.push({
            accountId,
            accountCode: account.code,
            accountName: account.name,
            type: "yoy_increase",
            severity: Math.abs(pct) > yearlyChangePct * 1.5 ? "critical" : "warning",
            currentValue: currTotal,
            referenceValue: prevTotal,
            changePct: pct,
          });
        }
      }
    }

    // Consecutive increase detection
    let consecutiveUp = 0;
    let consecutiveStart = -1;
    for (let m = 1; m < 12; m++) {
      const prev = monthlyAmounts[m - 1] ?? 0;
      const curr = monthlyAmounts[m] ?? 0;
      if (curr > prev && curr > 0) {
        if (consecutiveUp === 0) consecutiveStart = m - 1;
        consecutiveUp++;
        if (consecutiveUp >= consecutiveCount - 1) {
          const pct =
            (monthlyAmounts[consecutiveStart] ?? 0) > 0
              ? ((curr - (monthlyAmounts[consecutiveStart] ?? 0)) / Math.abs(monthlyAmounts[consecutiveStart] ?? 1)) * 100
              : 0;
          if (!anomalies.find(a => a.accountId === accountId && a.type === "consecutive_increase")) {
            anomalies.push({
              accountId,
              accountCode: account.code,
              accountName: account.name,
              type: "consecutive_increase",
              severity: "warning",
              months: Array.from({ length: consecutiveUp + 1 }, (_, i) => consecutiveStart + i + 1),
              currentValue: curr,
              referenceValue: monthlyAmounts[consecutiveStart] ?? 0,
              changePct: pct,
            });
          }
        }
      } else {
        consecutiveUp = 0;
        consecutiveStart = -1;
      }
    }
    void monthlySpikePct; // used via stddev threshold above
  }

  return anomalies;
}

// ── Main Hook ────────────────────────────────────────────────

export function useAccountingData(year: number): AccountingData {
  const [raw, setRaw] = useState<AccountingApiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classificationMode, setClassificationMode] = useState<ClassificationMode>("latest");

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

  // Memoized classifier
  const getEffectiveGroup = useCallback(
    (accountId: string, txGroupCode: string) => {
      if (!raw) return null;
      const { getEffectiveGroup: geg } = buildClassifier(
        raw.accounts,
        raw.customGroups,
        raw.classificationOverrides,
        classificationMode,
      );
      return geg(accountId, txGroupCode);
    },
    [raw, classificationMode],
  );

  // P&L calculations
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
    );
  }, [raw, year, classificationMode]);

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
    );
  }, [raw, classificationMode]);

  const anomalies = useMemo(() => {
    if (!yearlyPnl || !raw) return [];
    return detectAnomalies(yearlyPnl, prevYearlyPnl, raw.accounts, raw.alertRules);
  }, [yearlyPnl, prevYearlyPnl, raw]);

  // ── Mutations ──────────────────────────────────────────────

  const saveClassificationOverride = useCallback(
    async (accountId: string, groupId: string, note?: string): Promise<boolean> => {
      const res = await fetch("/api/accounting/classifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId, custom_group_id: groupId, note }),
      });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const deleteClassificationOverride = useCallback(
    async (accountId: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/classifications?account_id=${accountId}`, { method: "DELETE" });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const saveTransactionOverride = useCallback(
    async (txId: string, type: DbTransactionOverride["override_type"], newValue?: string, note?: string): Promise<boolean> => {
      const res = await fetch("/api/accounting/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: txId, override_type: type, new_value: newValue, note }),
      });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const deleteTransactionOverride = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/overrides?id=${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const saveGroup = useCallback(
    async (group: Partial<DbCustomGroup> & { name: string; parent_section: ParentSection; group_codes: string[] }): Promise<boolean> => {
      const method = group.id ? "PATCH" : "POST";
      const res = await fetch("/api/accounting/groups", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const deleteGroup = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/groups?id=${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const saveTag = useCallback(
    async (tag: Partial<DbCustomTag> & { name: string; color: string }): Promise<boolean> => {
      const method = tag.id ? "PATCH" : "POST";
      const res = await fetch("/api/accounting/tags", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tag", ...tag }),
      });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const deleteTag = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/tags?id=${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const assignTag = useCallback(
    async (accountId: string, tagId: string): Promise<boolean> => {
      const res = await fetch("/api/accounting/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "assign", account_id: accountId, tag_id: tagId }),
      });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const removeTag = useCallback(
    async (accountId: string, tagId: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/tags?account_id=${accountId}&tag_id=${tagId}`, { method: "DELETE" });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const saveCounterName = useCallback(
    async (code: string, displayName: string): Promise<boolean> => {
      const res = await fetch("/api/accounting/counter-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counter_account_code: code, display_name: displayName }),
      });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const saveAlertRule = useCallback(
    async (rule: Partial<DbAlertRule>): Promise<boolean> => {
      const method = rule.id ? "PATCH" : "POST";
      const res = await fetch("/api/accounting/alerts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

  const deleteAlertRule = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/alerts?id=${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
      return res.ok;
    },
    [fetchData],
  );

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
    yearlyPnl,
    prevYearlyPnl,
    anomalies,
    refetch: fetchData,
    getEffectiveGroup,
    saveClassificationOverride,
    deleteClassificationOverride,
    saveTransactionOverride,
    deleteTransactionOverride,
    saveGroup,
    deleteGroup,
    saveTag,
    deleteTag,
    assignTag,
    removeTag,
    saveCounterName,
    saveAlertRule,
    deleteAlertRule,
  };
}
